import React, { useRef, useState, useEffect } from 'react'

import * as tt from '@tomtom-international/web-sdk-maps'
import * as ttapi from '@tomtom-international/web-sdk-services'

import '@tomtom-international/web-sdk-maps/dist/maps.css'
import './my-map.scss';
import '../../helpers/_color.scss';

const MyMap = () => {
  const mapElement = useRef()
  const [map, setMap] = useState()
  const [longitude, setLongitude] = useState(8.259516645446809) // <-- Default position (Mainz,Germany)
  const [latitude, setLatitude] = useState(50.00147223178192) // *

  const origin = {
    lng: longitude,
    lat: latitude,
  }

  // ===== We need to convert the points ====
  const convertToPoints = (lngLat) => {
    return {
        point: {
            latitude: lngLat.lat,
            longitude: lngLat.lng
        }
    }
  }
  // ===== Drawing Area Function
  const drawRoute = (geoJson, map) => {
    if (map.getLayer('route')) {
        map.removeLayer('route')
        map.removeSource('route')
    }

    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson
      },
      paint: {
        'line-color': '#3decf2',
        'line-width': 6
      }
    })
  }

  // ===== We build our DeliveryMarker to pass the coordinates were ever we wanted to the map
  const addDeliveryMarker = (lngLat, map) => {
    const element = document.createElement('div')
    element.className = 'marker-delivery'
    new tt.Marker({
      element: element
    })
    .setLngLat(lngLat)
    .addTo(map)
  }

  useEffect(() => {
    const destinations = []
    // ===== GENERAL MAP SETTINGS FOR THE MAP =====
    let map = tt.map({
      key: process.env.REACT_APP_RUN_AWAY_TOM_TOM_API_KEY,
      container: mapElement.current,
      stylesVisibility: {
        trafficIncidents: true,
        trafficFlow: true,
      },
      center: [longitude, latitude],
      zoom: 16,
    })
    setMap(map)

    // ===== MARKER (Thief) =====
    const addMarker = () => {
      const popupOffset = {
        bottom: [0, -50]
      }

      const popup = 
        new tt.Popup({ offset: popupOffset })
            .setHTML('This is you!')

      const element = document.createElement('div')
      element.className = 'marker'

      const marker = new tt.Marker({
        draggable: true, // <-- Can I drag my marker around ? Yes.
        element: element // <-- Which element should I use as a marker ?
      }).setLngLat([longitude, latitude]) // <-- Where do you want to position it ?
        .addTo(map) // <-- add the marker to my map
      
      marker.on('dragend', () => { // <-- What will happend when I stop dragging the marker around
        const lngLat = marker.getLngLat() // <-- Give me the position of the marker
        setLongitude(lngLat.lng) // <-- Set the map longitude equal to the position of the marker
        setLatitude(lngLat.lat)  // <-- Set the map latitude equal to the position of the marker
      })

      marker.setPopup(popup).togglePopup()
      
    }
    addMarker()

    const sortDestinations = (locations) => {
        const pointsForDestinations = locations.map((destination) => {
            return convertToPoints(destination) // <-- Pass the location to my converter
        })
        
        // ===== Properties for the MatrixRouting
        const callParameters = {
            key: process.env.REACT_APP_RUN_AWAY_TOM_TOM_API_KEY,
            destinations: pointsForDestinations, // <-- We get all points to calculate the matrix
            origins: [convertToPoints(origin)], // <-- We need to pass the origin position as a parameter
        }

        // ===== The Promise allows you to do the matrix routing for this we implement @tomtom-international/web-sdk-services
        return new Promise((resolve, reject) => {
          ttapi.services
            .matrixRouting(callParameters)
            .then((matrixAPIResults) => {
              const results = matrixAPIResults.matrix[0] //<--- get my results

              const resultsArray = results.map((result, index) => {
                return {
                  location: locations[index],
                  drivingtime: result.response.routeSummary.travelTimeInSeconds,
                }
              })

              resultsArray.sort((a, b) => {
                return a.drivingtime - b.drivingtime
              })

              const sortedLocations = resultsArray.map((result) => {
                return result.location
              })

              resolve(sortedLocations)
            })
        })
    }

    const recalculateRoutes = () => {
      sortDestinations(destinations).then((sorted) => {
        sorted.unshift(origin)

        ttapi.services
          .calculateRoute({
            key: process.env.REACT_APP_RUN_AWAY_TOM_TOM_API_KEY,
            locations: sorted,
          })
          .then((routeData) => {
            const geoJson = routeData.toGeoJson()
            drawRoute(geoJson, map)
        })
      })
    }

    map.on('click', (e) => {
      destinations.push(e.lngLat) // <-- We fill here the destinations[] with the coordinates
      addDeliveryMarker(e.lngLat, map) // <-- We pass the clicked parameters to our function
      recalculateRoutes()
    })

    return () => map.remove()
  }, [longitude, latitude])

    return (
        <React.Fragment>
            <div className="container">
                {/* ===== LEFT SIDE CONTAINER */}
                <aside className="container__describtion">
                    <div className="container__describtion__content">
                        <h1 className="container__describtion__content__title">Run Away</h1>
                        <p>
                            Lorem ipsum dolor sit amet, consetetur sadipscing elitr,<br/>
                            sed diam nonumy eirmod tempor invidunt ut labore et dolore <br/>
                            magna aliquyam erat, sed diam voluptua. At vero eos et accusam<br/>
                            et justo duo dolores et ea rebum. Stet clita kasd gubergren,<br/>
                            no sea takimata sanctus est Lorem ipsum dolor sit amet.<br/>
                            At vero eos et accusam et justo duo dolores et ea rebum.<br/>
                            Stet clita kasd gubergren, no sea takimata sanctus est<br/>
                            Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet,<br/>
                            consetetur sadipscing elitr, sed diam nonumy eirmod tempor<br/>
                            invidunt ut labore et dolore magna aliquyam erat,<br/>
                            sed diam voluptua.
                        </p>
                    </div>
                </aside>

                {/* ===== MAP CONTAINER */}
                <div ref={mapElement} className="container__map"/>

                {/* ===== RIGHT SIDE CONTAINER */}
                <div className="container__searchbar">
                   <h3 className="container__searchbar__title">This is your position !</h3> 
                   <p className="container__searchbar__subtitle">Do you want to change your position ? <br/>Just tip in your coordinations</p>
                   <div className="container__searchbar__area">
                        <input 
                            type="text"
                            className="container__searchbar__area__inputField"
                            placeholder={longitude}
                            onChange={(e) => {setLongitude(e.target.value)}}
                        />
                        <span className="container__searchbar__area__var">- X</span>
                        <p>Longitude</p>
                   </div>
                    
                    <div className="container__searchbar__area">
                        <input 
                            type="text"
                            className="container__searchbar__area__inputField"
                            placeholder={latitude}
                            onChange={(e) => {setLatitude(e.target.value)}}/>
                        <span className="container__searchbar__area__var">- Y</span>
                        <p>Latitude</p>
                    </div>
                </div>
            </div>
        </React.Fragment>
    )
}

export default MyMap;