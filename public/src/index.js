import React from 'react';
import ReactDOM from 'react-dom';
import { Header } from 'semantic-ui-react';

import Legend from './components/Legend';
import EmotionDropdown from './components/EmotionDropdown';
import NewsList from './components/NewsList'; 
// import * as topicsObj from '../../reference/topics.js'; //figure this out but hardcoded for now on line 220

import './app.css';

import mapboxgl from 'mapbox-gl';
import { stateDict, countryDict } from '../../reference/dictionary.js';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      stateData: [],
      countryData: [],
      currentEmotion: 'joy',
      currentTopic: 'war',
      selectedState: 'California',
      modalOpen: false,
      map: null,
      colors: {
        joy: ['hsl(300, 100%, 0%)', 'hsl(300, 100%, 25%)', 'hsl(300, 100%, 50%)', 'hsl(300, 100%, 75%)', 'hsl(300, 100%, 100%)'],
        anger: ['hsl(60, 100%, 10%)', 'hsl(60, 100%, 25%)', 'hsl(60, 100%, 50%)', 'hsl(60, 100%, 75%)', 'hsl(60, 100%, 100%)'],
        disgust: ['hsl(250, 100%, 10%)', 'hsl(250, 100%, 25%)', 'hsl(250, 100%, 50%)', 'hsl(250, 100%, 75%)', 'hsl(250, 100%, 90%)'],
        fear: ['hsl(120, 100%, 10%)', 'hsl(120, 100%, 25%)', 'hsl(120, 100%, 50%)', 'hsl(120, 100%, 75%)', 'hsl(120, 100%, 90%)'],
        sadness: ['hsl(0, 50%, 10%)', 'hsl(0, 50%, 25%)', 'hsl(0, 50%, 50%)', 'hsl(0, 50%, 75%)', 'hsl(0, 50%, 90%)']
      }
    };

  }

  getColor(score, currentEmotion) {
    const hues = {
      joy: 300,
      anger: 60,
      disgust: 250,
      fear: 120,
      default: 0,
    };
    return `hsl(${hues[currentEmotion]}, 100%, ${score * 100}%)`;
  }


  componentDidMount() {
    const data = this.state.data;
    const currentEmotion = this.state.currentEmotion;
    const currentTopic = this.state.currentTopic;

    mapboxgl.accessToken = 'pk.eyJ1IjoiYmh1YW5nIiwiYSI6ImNqNDhxZWF6ZzBibjIycXBjaXN2Ymx3aHcifQ.MKQaPh3n3c94mcs0s2IfHw';

    const map = new mapboxgl.Map({
      container: 'map', // container id
      style: 'mapbox://styles/mapbox/dark-v9', //hosted style id
      center: [-95.38, 39], // starting position
      zoom: 2 // starting zoom
    });

    this.setState({ map });


    map.on('load', () => {

      /*~~~ COUNTRY ~~~*/
      map.addSource('country', {
        'type': 'geojson',
        'data': 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson'
      });

      map.addLayer({
        'id': 'country-layer',
        'type': 'fill',
        'paint': {
          'fill-opacity': 0
        },
        'source': 'country'
      });

      /*~~~ STATE ~~~*/
      map.addSource('state', {
        'type': 'geojson',
        'data': 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_1_states_provinces.geojson'
      });

      map.addLayer({
        'id': 'states-layer',
        'type': 'fill',
        'paint': {
          'fill-opacity': 0
        },
        'source': 'state'
      });

      let countryData = [];
      let stateData = [];
      // get data on tones once map loads
      fetch('/tones?scope=country')
        .then( res => res.json() )
        .then( data => {
          countryData = data; 
        })
        .catch( err => {
          console.log('Failed to get country data from server ', err);
        })
        .then(
          fetch('/tones?scope=state')
            .then( res => res.json() )
            .then( data => {
              stateData = data;
              this.setState({
                countryData,
                stateData
              });
              this.refreshMap([[stateData, 'state'], [countryData, 'country']], currentEmotion, currentTopic);

            })
            .catch( err => {
              console.log('Failed to get state data from server ', err);
            })
        )
    });

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['country-layer', 'states-layer']});
      if (!features.length) {
        return;
      } else {
        const feature = features[0]; 
        this.setState({
          selectedState: feature.properties.name,
          modalOpen: true
        });
        console.log(this.state);
      }
    });

  };

  // adds a layer representing data on the currently selected tone
  refreshMap(dataArr, currentEmotion, currentTopic) {
    //filter all country and state data by topic
    let filteredArr = [['data', 'state'], ['data', 'country']];
    dataArr.forEach((scopeData, idx) => {
      const tempArr = [];
      scopeData[0].forEach(data => {
        if (data.topic === currentTopic) {
          tempArr.push(data);
        }; 
      });
      filteredArr[idx][0] = tempArr; 
    });

    /*~~~ COUNTRY AND STATE ~~~*/
    filteredArr.forEach(scopeData => {
      //scopeData[0] is data set, scopeData[1] is data scope
      const type = scopeData[1];
      const data = scopeData[0];
      const dict = type === 'state' ? stateDict : countryDict;
      for (let i = 0; i < data.length; i++) {
        if (data[i].toneAverages[currentEmotion] !== null) {
          let color = this.getColor(data[i].toneAverages[currentEmotion], currentEmotion);
          this.state.map.addLayer({
            'id': data[i][type] + '-fill',
            'type': 'fill',
            'source': type,
            'layout': {},
            'paint': {
              'fill-color': color,
              'fill-opacity': 0.3
            },
            'filter': ['==', 'name', dict[data[i][type]]]
          });
        }
      }
    })
  }

  hideModal() {
    this.setState({
      modalOpen: false
    })
  }

  handleToneSelection(event, data) {
    const newlySelectedEmotion = data.value;

    this.setState({
      currentEmotion: newlySelectedEmotion
    });

    this.refreshMap([[this.state.stateData, 'state'], [this.state.countryData, 'country']], newlySelectedEmotion, this.state.currentTopic);
  }

  handleTopicSelection(event, data) {
    const newlySelectedTopic = data.value;

    this.setState({
      currentTopic: newlySelectedTopic
    });

    this.refreshMap([[this.state.stateData, 'state'], [this.state.countryData, 'country']], this.state.currentEmotion, newlySelectedTopic);
  }

  render() {

    return (
      <div className="app-root">
        <Header inverted>News Mapper</Header>
        <EmotionDropdown 
          handleEmotionChange={this.handleToneSelection.bind(this)} 
          emotions={Object.keys(this.state.colors)} 
          emotion={this.state.currentEmotion}
          handleTopicChange={this.handleTopicSelection.bind(this)}
          topics={['war', 'coffee']}
          topic={this.state.currentTopic}/>
        <Legend color={this.state.colors[this.state.currentEmotion]} emotion={this.state.currentEmotion}/>
        <NewsList
          state={this.state.selectedState}
          open={this.state.modalOpen}
          onCloseClick={this.hideModal.bind(this)}
          articles={[
            {title: 'Suh', source: 'http://www.google.com'},
            {title: 'Suh', source: 'http://www.google.com'},
            {title: 'Suh', source: 'http://www.google.com'},
            {title: 'Suh', source: 'http://www.google.com'},
            {title: 'Suh', source: 'http://www.google.com'},
          ]}
        />
      </div>
    );
    
  }

};


ReactDOM.render(<App />, document.getElementById('app'));
