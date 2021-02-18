/*eslint-disable */

//console.log(locations);
export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoicmFqYWtpc2hvcnJlZGR5IiwiYSI6ImNra2t4bXhldjJ0N2ozMG9jejZxN3NrZTYifQ.TdmCnFkCOmlp7uBTEQkvFA';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/rajakishorreddy/ckkkygdpe2uxo17ryareaf8cg',
    scrollZoom: false,
    //   center: [-118.24368, 34.05223],
    //   zoom: 4,
  });
  const bounds = new mapboxgl.LngLatBounds();
  locations.forEach((loc) => {
    //create a marker
    const el = document.createElement('div');
    el.className = 'marker'; //.marker is diffend in css
    //add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);
    //add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    //extend map bounds to include current locations
    bounds.extend(loc.coordinates);
  });
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
