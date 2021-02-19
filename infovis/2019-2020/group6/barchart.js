import { regio_aantallen_per_jaar } from "./main.js";


export const region_colors = d3.scaleOrdinal().domain([0, 1, 2, 3, 4, 5, 6, 7, 11, 10]) //0 tem 7 voor regio kleuren, 10 en 11 voor oranje en geel
  .range(["#f7f7f7", '#a6cee3', '#b2df8a', '#1f78b4', '#33a02c', '#fb9a99', '#ffff33', '#ffff33', '#1f78b4', '#a6cee3']);

export const activities_colors = d3.scaleOrdinal().domain(["", "kamp", "open initiatie", "workshop", "animatie", "bijscholing", "schoolactiviteit", "alles"]) //0 tem 7 voor regio kleuren, 10 en 11 voor oranje en geel
  .range(["#f7f7f7", '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#a65628', '#777777']);


const bar_width = 30;
const bar_padding = 10;
const max_bar_height = 350;
const max_height_scale = 1.7;
const region_plot_title = "Nieuwe leden per regio";
const activities_plot_title = "Bereik per type activiteit";



export function generateColorScaleYear(value, jaar) {

  if (value.woonplaats == "") return "#f7f7f7";
  // TODO: verplaats naar aparte array (min-max per jaar) zodat dit niet elke keer moet uitvoeren
  var aantallen = regio_aantallen_naar_aantallen_array(jaar);

  var customColor = d3.scaleSequential().domain([d3.min(aantallen), d3.max(aantallen)]).interpolator(d3.interpolateYlOrRd);
  return customColor(value.aantal);
}

export function regio_aantallen_naar_aantallen_array(jaar) {
  var aantallen = [];
  for (var [key, jaar_tuple] of Object.entries(regio_aantallen_per_jaar)) {
    if (+jaar_tuple.jaar == +jaar) {
      for (var [key2, regio_tuple] of Object.entries(jaar_tuple.regios)) {
        if (regio_tuple.woonplaats != "") {
          aantallen.push(+regio_tuple.aantal);
        }
      }
    }
  }
  return aantallen;
}

export function visualiseAantallenBarchart(svg, data) {

  const eerst_jaar = data[0].jaar;
  const laatste_jaar = data[data.length - 1].jaar;
  var max = 1;
  data.forEach(tuple => { if (tuple.aantal > max) max = tuple.aantal; })
  const height_scale = max_bar_height / max / max_height_scale;
  console.log(height_scale);

  svg.selectAll(".bar").remove();
  // draw each bar of the barchart
  data.forEach(element => {
    // append a group of all subelements for each year
    var group = svg.append("g")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
      .attr("y", max_bar_height - element.aantal * height_scale)
      .attr("height", element.aantal * height_scale)
      .attr("width", bar_width)
      .attr("class", "bar")
      .attr("cursor", "pointer")
      .attr("id", ("year" + element.jaar))
      .attr("title", element.jaar);
    // main rectangle of the total number of members that year
    group
      .append("rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
      .attr("y", max_bar_height - element.aantal * height_scale - 50)
      .attr("height", element.aantal * height_scale)
      .attr("width", bar_width)
      .attr("class", "bar-rect")
      .style("fill", "white")
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .style("opacity", 0.5);
    // filling the main rectangle with colors for each region, sorted by region
    var count = 0;
    element.regios.sort(function (a, b) {
      return (a.regio_id > b.regio_id) ? 1 : -1;
    });

    //per jaar de regio's
    //draw everything but herentals
    for (let [key, value] of Object.entries(element.regios)) {
      if(value.woonplaats == "herentals"){//do nothing
      }
      else{
        
        var color = "#f7f7f7"
      
      group
        .append("rect")
        .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
        .attr("y", max_bar_height - element.aantal * height_scale + count - 50)
        .attr("height", value.aantal * height_scale) //value: gemeente, per jaar: element
        .attr("width", bar_width)
        .style("fill", color)//generateColorScaleYear(value, element.jaar))
        //.style("fill", customColor(value.aantal))
        .style("fill-opacity", 0.8)
        .append("svg:title")
        .text(function () {
          if (value.woonplaats !== "") {
            return value.woonplaats;
          } else {
            return "Onbekend";
          }
        });
      count += value.aantal * height_scale;
      }
    }

    //draw herentals last
    for (let [key, value] of Object.entries(element.regios)) {
      if(value.woonplaats == "herentals"){
        var color = generateColorScaleYear(value, element.jaar);
        group
        .append("rect")
        .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
        .attr("y", max_bar_height - element.aantal * height_scale + count - 50)
        .attr("height", value.aantal * height_scale) //value: gemeente, per jaar: element
        .attr("width", bar_width)
        .style("fill", color)//generateColorScaleYear(value, element.jaar))
        //.style("fill", customColor(value.aantal))
        .style("fill-opacity", 0.8)
        .append("svg:title")
        .text(function () {
          if (value.woonplaats !== "") {
            return value.woonplaats;
          } else {
            return "Onbekend";
          }
        });
      count += value.aantal * height_scale;
      }else{
        //do nothing

      }
    }
    // year labels as x-axis
    group
      .append("text")
      .text(element.jaar)
      .attr("class", "text bar-rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding) + bar_width / 2)
      .attr("y", max_bar_height + 20 - 50)
      .style("text-anchor", "middle");
    // value labels above each bar
    group
      .append("text")
      .text(element.aantal)
      .attr("class", "text bar-rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding) + bar_width / 2)
      .attr("y", max_bar_height - element.aantal * height_scale - 10 - 50)
      .style("text-anchor", "middle");
  });
  // plot name above the whole barchart
  svg
    .append("text")
    .text(region_plot_title)
    .attr("class", "text title bar")
    .attr("x", 50 + (laatste_jaar - eerst_jaar + 1) / 2 * (bar_width + bar_padding))
    .attr("y", 100 - 50)
    .style("text-anchor", "middle");
}

export function visualiseRegiosBarchart(svg, data) {
  const eerst_jaar = data[0].jaar;
  const laatste_jaar = data[data.length - 1].jaar;
  var max = 1;
  data.forEach(tuple => { if (tuple.aantal > max) max = tuple.aantal; })
  const height_scale = max_bar_height / max / max_height_scale;

  svg.selectAll(".bar").remove();
  // draw each bar of the barchart
  data.forEach(element => {
    // append a group of all subelements for each year
    var group = svg.append("g")
      .attr("x", (element.jaar - eerst_jaar) * (bar_width + bar_padding))
      .attr("y", (max_bar_height - element.aantal * height_scale))
      .attr("height", (element.aantal * height_scale))
      .attr("width", bar_width)
      .attr("class", "bar")
      .attr("cursor", "pointer")
      .attr("id", ("year" + element.jaar))
      .attr("title", element.jaar);
    // main rectangle of the total number of members that year
    group
      .append("rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
      .attr("y", max_bar_height - element.aantal * height_scale - 50)
      .attr("height", element.aantal * height_scale)
      .attr("width", bar_width)
      .attr("class", "bar-rect")
      .style("fill", "white")
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .style("opacity", 0.5);
    // filling the main rectangle with colors for each region, sorted by region
    var count = 0;
    element.regios.sort(function (a, b) {
      return (a.regio_id > b.regio_id) ? 1 : -1;
    });
    //per jaar de regio's
    for (let [key, value] of Object.entries(element.regios)) {
      group
        .append("rect")
        .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
        .attr("y", max_bar_height - element.aantal * height_scale + count - 50)
        .attr("height", value.aantal * height_scale) //value: gemeente, per jaar: element
        .attr("width", bar_width)
        .style("fill", region_colors(value.regio_id))
        .style("fill-opacity", 0.6)
        .append("svg:title")
        .text(function () {
          if (value.woonplaats !== "") {
            return value.woonplaats;
          }
          else {
            return "Onbekend";
          }
        });
      count += value.aantal * height_scale;
    }
    // year labels as x-axis
    group
      .append("text")
      .text(element.jaar)
      .attr("class", "text bar-rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding) + bar_width / 2)
      .attr("y", max_bar_height + 20 - 50)
      .style("text-anchor", "middle");
    // value labels above each bar
    group
      .append("text")
      .text(element.aantal)
      .attr("class", "text bar-rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding) + bar_width / 2)
      .attr("y", max_bar_height - element.aantal * height_scale - 10 - 50)
      .style("text-anchor", "middle");
  });
  // plot name above the whole barchart
  svg
    .append("text")
    .text(region_plot_title)
    .attr("class", "text title bar")
    .attr("x", 50 + (laatste_jaar - eerst_jaar + 1) / 2 * (bar_width + bar_padding))
    .attr("y", 100 - 50)
    .style("text-anchor", "middle");
}

export function visualiseActivitiesBarchart(svg, data) {
  //data: activiteit_aantallen_per_jaar:{jaar, activiteiten} waarbij activiteiten = [{activiteit, gemeente_sommen}] waarbij gemeente_som = [{gemeente, aantal}]
  const eerst_jaar = data[0].jaar;
  const laatste_jaar = data[data.length - 1].jaar;
  var max = 1;
  data.forEach(tuple => { if (tuple.aantal > max) max = tuple.aantal; })
  const height_scale = max_bar_height / max / max_height_scale;

  svg.selectAll(".bar").remove();
  // draw each bar of the barchart
  data.forEach(element => {
    // append a group of all subelements for each year
    var group = svg.append("g")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
      .attr("y", max_bar_height - element.aantal * height_scale)
      .attr("height", element.aantal * height_scale)
      .attr("width", bar_width)
      .attr("class", "bar")
      .attr("cursor", "pointer")
      .attr("id", ("year" + element.jaar))
      .attr("title", element.jaar);
    // main rectangle of the total number of members that year
    group
      .append("rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
      .attr("y", max_bar_height - element.aantal * height_scale - 50)
      .attr("height", element.aantal * height_scale)
      .attr("width", bar_width)
      .attr("class", "bar-rect")
      .style("fill", "white")
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .style("opacity", 0.5);
    // filling the main rectangle with colors for each region, sorted by region
    var count = 0;
    element.activiteiten.sort(function (a, b) {
      return (a.activiteit > b.activiteit) ? 1 : -1;
    });

    //per jaar de regio's
    for (let [key, value] of Object.entries(element.activiteiten)) {
      group
        .append("rect")
        .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
        .attr("y", max_bar_height - element.aantal * height_scale + count - 50)
        .attr("height", value.aantal * height_scale) //value: gemeente, per jaar: element
        .attr("width", bar_width)
        .style("fill", activities_colors(value.activiteit))
        .style("fill-opacity", 0.8)
        .append("svg:title")
        .text(function () {
          if (value.activiteit !== "") {
            return value.activiteit;
          }
          else {
            return "Onbekend";
          }
        });
      count += value.aantal * height_scale;
    }
    // year labels as x-axis
    group
      .append("text")
      .text(element.jaar)
      .attr("class", "text bar-rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding) + bar_width / 2)
      .attr("y", max_bar_height + 20 - 50)
      .style("text-anchor", "middle");
    // value labels above each bar
    group
      .append("text")
      .text(element.aantal)
      .attr("class", "text bar-rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding) + bar_width / 2)
      .attr("y", max_bar_height - element.aantal * height_scale - 10 - 50)
      .style("text-anchor", "middle");
  });
  // plot name above the whole barchart
  svg
    .append("text")
    .text(activities_plot_title)
    .attr("class", "text title bar")
    .attr("x", 50 + (laatste_jaar - eerst_jaar + 1) / 2 * (bar_width + bar_padding))
    .attr("y", 100 - 50)
    .style("text-anchor", "middle");
}


export function visualiseRegionalActivitiesBarchart(svg, data, town) {
  const eerst_jaar = data[0].jaar;
  const laatste_jaar = data[data.length - 1].jaar;
  var max = 1;
  data.forEach(tuple => { if (tuple.aantal > max) max = tuple.aantal; })
  const height_scale = max_bar_height / max / max_height_scale;
  const plot_title = "Bereik per type activiteit in " + town;

  svg.selectAll(".bar").remove();
  // draw each bar of the barchart
  data.forEach(element => {
    // append a group of all subelements for each year
    var group = svg.append("g")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
      .attr("y", max_bar_height - element.aantal * height_scale)
      .attr("height", element.aantal * height_scale)
      .attr("width", bar_width)
      .attr("class", "bar")
      .attr("cursor", "pointer")
      .attr("id", ("year" + element.jaar))
      .attr("title", element.jaar);
    // main rectangle of the total number of members that year
    group
      .append("rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
      .attr("y", max_bar_height - element.aantal * height_scale - 50)
      .attr("height", element.aantal * height_scale)
      .attr("width", bar_width)
      .attr("class", "bar-rect")
      .style("fill", "white")
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .style("opacity", 0.5);
    // filling the main rectangle with colors for each region, sorted by region
    var count = 0;
    element.activiteiten.sort(function (a, b) {
      return (a.activiteit > b.activiteit) ? 1 : -1;
    });

    //per jaar de regio's
    for (let [key, value] of Object.entries(element.activiteiten)) {
      group
        .append("rect")
        .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding))
        .attr("y", max_bar_height - element.aantal * height_scale + count - 50)
        .attr("height", value.aantal * height_scale) //value: gemeente, per jaar: element
        .attr("width", bar_width)
        .style("fill", activities_colors(value.activiteit))
        .style("fill-opacity", 0.8)
        .append("svg:title")
        .text(function () {
          if (value.activiteit !== "") {
            return value.activiteit;
          }
          else {
            return "Onbekend";
          }
        });
      count += value.aantal * height_scale;
    }
    // year labels as x-axis
    group
      .append("text")
      .text(element.jaar)
      .attr("class", "text bar-rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding) + bar_width / 2)
      .attr("y", max_bar_height + 20 - 50)
      .style("text-anchor", "middle");
    // value labels above each bar
    group
      .append("text")
      .text(element.aantal)
      .attr("class", "text bar-rect")
      .attr("x", 50 + (element.jaar - eerst_jaar) * (bar_width + bar_padding) + bar_width / 2)
      .attr("y", max_bar_height - element.aantal * height_scale - 10 - 50)
      .style("text-anchor", "middle");
  });
  // plot name above the whole barchart
  svg
    .append("text")
    .text(plot_title)
    .attr("class", "text title bar")
    .attr("x", 50 + (laatste_jaar - eerst_jaar + 1) / 2 * (bar_width + bar_padding))
    .attr("y", 100 - 50)
    .style("text-anchor", "middle");
}
