// FILE load_geojson.js: converts geoJSON data to javascript objects

// array of tuples containing the town name and the geojson data of that town
var towns_geojson_data = [];

// function loadGeojsonFiles(towns) : initializes towns geojson data for which there is data in the csv files
//  param towns : a list of towns that have to be colored
function initializeGeojsonFiles(towns) {
  towns.forEach(function (town) {
    var request = new XMLHttpRequest();
    var url = "geojson/gem-" + town + ".geojson";
    request.open("GET", url, false);
    request.send(null);
    towns_geojson_data.push({ "gemeente": town, "geojson": JSON.parse(request.responseText), "coordinates": { lat: 0, lon: 0 } });
  });

  var request = new XMLHttpRequest();
  var url = "geojson/zipcode-belgium.json";
  request.open("GET", url, false);
  request.send(null);
  var text = JSON.parse(request.responseText);
  text.forEach(function (elem) {
    towns_geojson_data.forEach(function (town) {
      if (elem.city.toLowerCase() == town.gemeente) {
        town.coordinates = { lat: elem.lat, lon: elem.lng };
      }
    });

  });
}
