import { region_colors, activities_colors, generateColorScaleYear } from "./barchart.js";
import { visualizeLocalMembersByRegion, visualiseActivitiesOnMap, resetNeighboursVisualization, updateGemeenteCard, getInschrijvingenForGemeente } from "./main.js";

const map_div_id = "map-body";
const antwerpen_province_coords = [51.1949705, 4.6548650];
const map_height = 10;

// load the map to province antwerp ~ map library = leaflet!
var map = L.map(map_div_id).setView(antwerpen_province_coords, map_height);
map.options.minZoom = 9;
map.options.maxZoom = 11;

map.on('zoomend', function () {
  var zoomlevel = map.getZoom();
  console.log("Current Zoom Level =" + zoomlevel);
  visualiseActivitiesOnMap();
});

// add an interface to the map
L.tileLayer('	https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);



// initialize layergroup which will contain all objects (town, points, etc.) drawn on the map
var townsGroup = new L.LayerGroup();
townsGroup.addTo(map);

var activitiesGroup = new L.LayerGroup();
activitiesGroup.addTo(map);

// function colorRegions(towns)
//  param towns: an array of all the towns that have to be colored
export function colorByRegion(data_of_selected_year, clicked_town = null) {
  var neighbors = [];
  var lineOpacity = 0.3;
  var fillOpacity = 0.6;

  var towns = [];
  extractTownsFromData(data_of_selected_year, towns);

  if (clicked_town !== null) {
    neighbors = getNeighbors(clicked_town, edges);
    visualizeLocalMembersByRegion(clicked_town, neighbors);

    towns = towns.filter(town => town !== clicked_town);
    towns.push(clicked_town);
    // Update filter text
    d3.select("#gemeentefilter").remove();
    d3.select("#geen-filters").remove();
    d3.select("#filters").append("button").text("Gemeente: " + clicked_town)
      .attr("id", "gemeentefilter")
      .attr("class", "pillButton gemeente")
      .on("click", function () {
        // Remove filter button
        d3.select("#gemeentefilter").remove();
        // If no more filters present, put 'geen' placeholder text
        if (d3.selectAll(".pillButton").empty()) {
          d3.select("#filters").append("p").text("Geen").attr("id", "geen-filters")
        };
        resetNeighboursVisualization();
      });
  }

  townsGroup.clearLayers();
  towns.forEach(function (town_name) {
    // get the location data for the town
    var town_data = getLocationDataForTown(town_name);
    if (town_data !== null) {
      // get the color for the region of the town
      var color_for_town = region_colors(town_to_region_dict[town_data.gemeente]);
      if (clicked_town !== null) {
        if (town_name === clicked_town) {
          color_for_town = '#1f78b4';
          fillOpacity = 0.6;
          lineOpacity = 0.8;
        } else if (neighbors.includes(town_name)) {
          color_for_town = '#a6cee3';
          fillOpacity = 0.6;
          lineOpacity = 0.8;
        }
        else {
          color_for_town = 'grey';
          fillOpacity = 0.1;
          lineOpacity = 0.2;
        }
      }

      // add the location to the map with that color
      townsGroup
        .addLayer(
          L.geoJson(town_data.geojson, {
            "color": color_for_town,
            "weight": 2,
            "opacity": lineOpacity,
            "fillOpacity": fillOpacity,
            "gemeente": town_data.gemeente,
            "title": town_data.gemeente
          })
            .addTo(map)
            .on('click', function (data) {
              // TODO: clicked on a town => update visualization
              //  - data.target.options.gemeente contains town that was clicked
              //  - use "layerGroup.clearLayers();" to delete the old visualization on the map
              if (clicked_town !== null) {
                if (data.target.options.gemeente !== clicked_town) {
                  towns = towns.filter(town => town !== clicked_town);
                  console.dir(towns);
                  colorByRegion(towns, data.target.options.gemeente);
                } else {
                  d3.select("#gemeentefilter").remove();
                  resetNeighboursVisualization();
                }

              } else {
                towns = towns.filter(town => town !== clicked_town);
                colorByRegion(data_of_selected_year, data.target.options.gemeente);
              }
              updateGemeenteCard();
            })
            .on('mouseover', function (data) {
              // TODO: if we want to show some data when hovering over the town, we can do that here
            }).bindTooltip(town_data.gemeente[0].toUpperCase() + town_data.gemeente.substring(1) + " (" + String(getInschrijvingenForGemeente(town_data.gemeente)) + ")", { permanent: false, className: "town-label", offset: [0, 0], direction: "center" }));
    }
  });
  visualiseActivitiesOnMap();
}

function extractTownsFromData(data_of_selected_year, towns) {
  data_of_selected_year.map(function (tuple) {
    if (tuple.woonplaats !== "") {
      towns.push(tuple.woonplaats);
    }
  });
}

export function removePreviousActivities() {
  activitiesGroup.clearLayers();
}


export function drawActivity(town, number, type) {
  let coords = getLocationDataForTown(town);
  if (coords == null) {
    return;
  }
  let lon = coords["coordinates"]["lon"];
  let lat = coords["coordinates"]["lat"];

  if (activities_colors(type) === undefined) {
    console.log("Warning - '" + type + "' is not a defined activity type (map.js - drawActivity)");
  }
  const fillColor = activities_colors(type);
  const label = "text-label-for-zoom-" + String(map.getZoom());

  if (number > 0) {
    activitiesGroup.addLayer(L.circle([lat, lon], {
      color: fillColor,
      fillColor: fillColor,
      fillOpacity: 0.8,
      weight: 0,
      radius: 200 + (Math.log(number) + 1) * 120,
      offset: [0, 0]
    })
      .addTo(map)
      .bindTooltip(String(number), { permanent: true, className: label, offset: [0, 0], direction: "center" })
      .on({
        mouseover: function () {
          var toolTip = this.getTooltip();
          this.closeTooltip(toolTip);
          this.bindTooltip(type, { permanent: true, className: "town-label", offset: [0, 0], direction: "center" });
        },
        mouseout: function () {
          var toolTip = this.getTooltip();
          this.closeTooltip(toolTip);
          this.bindTooltip(String(number), { permanent: true, className: label, offset: [0, 0], direction: "center" });
        }
      }));
  }

}

export function colorByValue(data_of_selected_year, jaar) {

  townsGroup.clearLayers();

  data_of_selected_year.forEach(function (town) {

    var town_data = getLocationDataForTown(town.woonplaats);
    if (town_data !== null) {
      // get the color for the region of the town
      //var colorScale = generateColorScale();
      var color_for_town = generateColorScaleYear(town, jaar);

      //var color_for_town = region_colors(town_to_region_dict[town_data.gemeente]);
      // add the location to the map with that color
      townsGroup
        .addLayer(
          L.geoJson(town_data.geojson, {
            "color": color_for_town,
            "weight": 2,
            "opacity": 1,
            "fillOpacity": 0.7,
            "gemeente": town_data.gemeente,
            "title": town_data.gemeente
          })
            .addTo(map)
            .on('click', function (data) {

              colorByRegion(data_of_selected_year, data.target.options.gemeente);
            })
            .on('mouseover', function (data) {
              // TODO: if we want to show some data when hovering over the town, we can do that here
            }).bindTooltip(town_data.gemeente, { permanent: false, className: "town-label", offset: [0, 0], direction: "center" }));
    }
  });

}

// function getGeojsonDataForTown(town_name) : get the location data of the town in the geojson data (which gets initialized at the start)
//  param town_name
function getLocationDataForTown(town_name) {
  var geojson_data = towns_geojson_data.filter(value => value.gemeente == town_name);
  if (geojson_data.length == 0) {
    //console.log("Could not find the JSON data of town " + town_name);
    return null;
  } else {
    return geojson_data[0];
  }
}

