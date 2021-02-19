import { colorByRegion, colorByValue, drawActivity, removePreviousActivities } from "./map.js";
import { visualiseAantallenBarchart, visualiseRegiosBarchart, visualiseActivitiesBarchart, visualiseRegionalActivitiesBarchart, regio_aantallen_naar_aantallen_array } from "./barchart.js";
import { storeActivitiesDataInArrays, storeStudentDataInArrays, getNeighboursPerYear, extractActivitiesDataForTown } from "./process_data.js";

var selected_year = 2019;
var selected_activity = {
  Animaties: true,
  Kampen: false,
  OpenInitiaties: false,
  Schoolactiviteiten: false,
  Workshops: false,
  Bijscholing: false
};


var showAantal = false;
var clicked_neighbour = "";
var neighbours = [];

const weergaveRadio = d3.selectAll("#weergaveRadio");
const activiteitRadio = d3.selectAll("#activiteitCheckbox");
const aantalLegende = document.getElementById("aantal-legend");
const aantalLegendeMin = document.getElementById("aantal-legend-min");
const aantalLegendeMax = document.getElementById("aantal-legend-max");

const main_svg = d3
  .select("#svg-body")
  .append("svg")
  .attr("id", "plot-svg")
  .attr("width", "100%")
  .attr("height", "35%");
const activities_svg = d3
  .select("#svg-body")
  .append("svg")
  .attr("id", "plot-svg")
  .attr("width", "100%")
  .attr("height", "35%");

// arrays for data processing

export var regio_aantallen_per_jaar = []; // [{jaar, aantal, regios}] waarbij regios = [{woonplaats, aantal, regio_id}]
export var activiteit_aantallen_per_jaar = []; // {jaar, activiteiten} waarbij activiteiten = [{activiteit, gemeente_sommen}] waarbij gemeente_som = [{gemeente, aantal}]


// radio buttons to change the view total/regions
weergaveRadio.on('change', function (d) {
  console.log(this.checked);
  /*if (clicked_neighbour !== "") {
    clicked_neighbour = "";
    neighbours = [];
    d3.select("#gemeentefilter").remove();
    updateGemeenteCard();
  }*/

  if (this.checked == true) {
    showAantal = true;
    visualizeMembersByValue();
    aantalLegende.hidden = false;
  }
  else if (this.checked == false) {
    showAantal = false;
    visualizeMembersByRegion();
    aantalLegende.hidden = true;
  }
  visualiseActivitiesOnMap();

});

activiteitRadio.on('change', function (d) {
  toggleActivity(this.value, true);
});

function addFilter(filtertype) {
  d3.select("#filters").insert("button").text(filtertype)
    .attr("id", filtertype + "filter")
    .attr("class", "pillButton")
    .attr("value", filtertype)
    .on("click", filterClicked);
  updateNoActivitiesPlaceholder();
}

function filterClicked() {
  var toEdit = "" + this.value;
  selected_activity[toEdit] = false;

  makeActivitiesBarchart();
  visualiseActivitiesOnMap();
  // Remove filter button
  var toRemove = "#" + this.value + "filter";
  d3.select(toRemove).remove();
  // If no more filters present, put 'geen' placeholder text
  updateNoActivitiesPlaceholder();
  // decheck checkbox
  var selected = this.value;
  // update toggle
  updateActivityToggle();

  d3.selectAll("#activiteitCheckbox").each(function () {
    if (selected == this.value) d3.select(this).property('checked', false);
  });
}

main();

// process data (main function)
function main() {
  d3.csv("/data/OverzichtLeerlingen.csv").then(function (leerlingen_data) {
    storeStudentDataInArrays(leerlingen_data);
    d3.csv("/data/activiteiten.csv").then(function (activiteiten_data) {
      storeActivitiesDataInArrays(activiteiten_data);
      visualizeMembersByRegion(); // default view
      visualiseActivitiesOnMap();
    });
  });
  // Add toggle event to toggle button 
  d3.select("#activity-toggle").on('click', function () { toggleAllActivities() });
  // Add initial filter pillButton manually (animaties is already true in dictionary)
  addFilter("Animaties");
  updateYearLegend();
}


export function getInschrijvingenForGemeente(gemeenteNaam) {
  const gemeenten = regio_aantallen_per_jaar[-2008 + parseInt(selected_year)].regios;
  for (var i = 0; i < gemeenten.length; i++) {
    var gemeente = gemeenten[i];
    if (gemeente.woonplaats === gemeenteNaam) { return gemeente.aantal; }
  }
  return 0;
}

function getActiviteitForGemeente(gemeenteNaam, activiteitNaam) {
  const activiteiten = activiteit_aantallen_per_jaar[-2008 + parseInt(selected_year)].activiteiten;
  for (var i = 0; i < activiteiten.length; i++) {
    var activiteit = activiteiten[i];
    if (activiteit.activiteit === activiteitNaam) {
      var gemeenten = activiteit.data;
      for (var j = 0; j < gemeenten.length; j++) {
        if (gemeenten[j].gemeente === gemeenteNaam) { return gemeenten[j].aantal }
      }
    }
  }
  return 0;
}

// Method that should be called whenever toggles are added or deleted.
function updateNoActivitiesPlaceholder() {
  if (d3.selectAll(".pillButton").empty()) {
    d3.select("#filters").append("p").text("Geen").attr("id", "geen-filters")
  }
  else {
    d3.select("#geen-filters").remove();
  };
}

// Method that should be called whenever activities are (de)selected
function updateActivityToggle() {
  if (getSelectedActivity() === "alles") {
    d3.select("#activity-toggle").attr("class", "activitiesButton on")
  }
  else { d3.select("#activity-toggle").attr("class", "activitiesButton off") }
}


// Use this function to toggle an activity (on or off).
// It handles updating selected_activities, UI checkboxes and toggles, as well as updates the map and barcharts
function toggleActivity(activity, fromUI = false) {
  // toggle dictionary
  selected_activity[activity] = !selected_activity[activity]
  // toggle checkbox in UI, if 
  if (!fromUI) {
    d3.selectAll("#activiteitCheckbox").each(function () {
      if (activity == this.value) {
        const oldValue = d3.select(this).property('checked');
        d3.select(this).property('checked', !oldValue);
      }
    });
  }
  // toggle filter pillbutton
  if (d3.select("#" + activity + "filter").empty()) { addFilter(activity); }
  else { d3.select("#" + activity + "filter").remove(); }
  // Update UI elements
  updateNoActivitiesPlaceholder();
  updateActivityToggle();
  // Update map and barplots
  makeActivitiesBarchart();
  visualiseActivitiesOnMap();
}

// Used to toggle all activities on or off
function toggleAllActivities() {
  // Toggle all activities off
  if (getSelectedActivity() === "alles") {
    for (var act in selected_activity) {
      toggleActivity(act);
    }
  }
  // Toggle unselected activities on
  else {
    for (var act in selected_activity) {
      if (!selected_activity[act]) toggleActivity(act);
    }
  }
}

export function updateGemeenteCard() {

  const inschrijvingen = getInschrijvingenForGemeente(clicked_neighbour);
  d3.select("#gemeenteInfo").remove();
  if (clicked_neighbour == "") return;
  d3.select("#commands-body")
    .append("div")
    .attr("id", "gemeenteInfo")
    .attr("class", "card")
    .insert("h3").text("Gemeente")
    .append("hr");
  d3.select("#gemeenteInfo").append("div").attr("id", "GemeenteInschrijvingen");

  const animatie = getActiviteitForGemeente(clicked_neighbour, "animatie")
  const kamp = getActiviteitForGemeente(clicked_neighbour, "kamp")
  const initiatie = getActiviteitForGemeente(clicked_neighbour, "open initiatie")
  const school = getActiviteitForGemeente(clicked_neighbour, "schoolactiviteit")
  const workshop = getActiviteitForGemeente(clicked_neighbour, "workshop")
  const bijscholing = getActiviteitForGemeente(clicked_neighbour, "bijscholing")

  d3.select("#GemeenteInschrijvingen").insert("b").text("• Naam: ");
  d3.select("#GemeenteInschrijvingen").insert("p").text(clicked_neighbour[0].toUpperCase() + clicked_neighbour.substring(1)).append("div")
  d3.select("#GemeenteInschrijvingen").insert("b").text("• Inschrijvingen: ")
  d3.select("#GemeenteInschrijvingen").insert("p").text(inschrijvingen);
  d3.select("#GemeenteInschrijvingen").append("div").attr("id", "GemeenteActiviteiten");
  if (animatie === 0 && kamp === 0 && initiatie === 0 && school === 0 && workshop === 0 && bijscholing === 0) {
    d3.select("#GemeenteInschrijvingen").insert("b").text("• Geen activiteiten in dat jaar.");
  }
  else {
    d3.select("#GemeenteActiviteiten").insert("p").attr("class", "h4-like").text("Bereik activiteiten")
    if (animatie > 0) {
      d3.select("#GemeenteInschrijvingen").insert("b").attr("class", "smalltext").text("• Animaties: ");
      d3.select("#GemeenteInschrijvingen").insert("p").attr("class", "smalltext").text(animatie).append("div");
    }
    if (kamp > 0) {
      d3.select("#GemeenteInschrijvingen").insert("b").attr("class", "smalltext").text("• Kampen: ");
      d3.select("#GemeenteInschrijvingen").insert("p").attr("class", "smalltext").text(kamp).append("div");
    }
    if (initiatie > 0) {
      d3.select("#GemeenteInschrijvingen").insert("b").attr("class", "smalltext").text("• Initiaties: ");
      d3.select("#GemeenteInschrijvingen").insert("p").attr("class", "smalltext").text(initiatie).append("div");
    }
    if (school > 0) {
      d3.select("#GemeenteInschrijvingen").insert("b").attr("class", "smalltext").text("• Schoolact.: ");
      d3.select("#GemeenteInschrijvingen").insert("p").attr("class", "smalltext").text(school).append("div");
    }
    if (workshop > 0) {
      d3.select("#GemeenteInschrijvingen").insert("b").attr("class", "smalltext").text("• Workshops: ");
      d3.select("#GemeenteInschrijvingen").insert("p").attr("class", "smalltext").text(workshop).append("div");
    }
    if (bijscholing > 0) {
      d3.select("#GemeenteInschrijvingen").insert("b").attr("class", "smalltext").text("• Bijscholing: ");
      d3.select("#GemeenteInschrijvingen").insert("p").attr("class", "smalltext").text(bijscholing).append("div");
    }
  }
}

export function visualizeMembersByValue() {
  visualiseAantallenBarchart(main_svg, regio_aantallen_per_jaar);
  updateAantalLegendValues();
  makeActivitiesBarchart();
  var towns = getDataOfSelectedYear().regios.filter(value => value.woonplaats !== "");

  colorByValue(towns, selected_year);
  addClickListenerToBars();
}

function updateAantalLegendValues() {
  aantalLegende.hidden = false;
  var aantallen = regio_aantallen_naar_aantallen_array(selected_year);
  aantalLegendeMin.innerHTML = d3.min(aantallen);
  aantalLegendeMax.innerHTML = d3.max(aantallen);
}

function makeActivitiesBarchart() {

  if (clicked_neighbour !== "") {
    visualizeLocalMembersByRegion(clicked_neighbour, neighbours);
  } else {
    var data = extractByActivityType(activiteit_aantallen_per_jaar);
    visualiseActivitiesBarchart(activities_svg, data);
    addClickListenerToBars();
  }

}

function extractByActivityType(input_data) {
  var data = [];
  input_data.forEach(function (activiteit_aantallen) {
    var sum = 0;
    var relevant_activities = activiteit_aantallen["activiteiten"].filter(function (value) {
      return selected_activity[translateActivityName(value.activiteit)];
    });
    relevant_activities.forEach(activity => sum += activity.aantal);

    data.push({ jaar: activiteit_aantallen.jaar, aantal: sum, activiteiten: relevant_activities });
  });
  return data;
}

function updateYearLegend() {
  d3.select("#jaar-legend").remove();
  d3.select(".row").append("div").attr("id", "jaar-legend")
    .insert("p").text("Jaar: " + selected_year).attr("id", "jaar-label");
}

function translateActivityName(activity) {
  if (activity == "animatie") {
    return "Animaties";
  } else if (activity == "kamp") {
    return "Kampen";
  } else if (activity == "open initiatie") {
    return "OpenInitiaties";
  } else if (activity == "schoolactiviteit") {
    return "Schoolactiviteiten";
  } else if (activity == "workshop") {
    return "Workshops";
  } else if (activity == "bijscholing") {
    return "Bijscholing";
  } else {
    console.log("can't match activity " + activity);
    return "Bijscholing";
  }
}

function deTranslateActivityName(activity) {
  if (activity == "Animaties") {
    return "animatie";
  } else if (activity == "Kampen") {
    return "kamp";
  } else if (activity == "OpenInitiaties") {
    return "open initiatie";
  } else if (activity == "Schoolactiviteiten") {
    return "schoolactiviteit";
  } else if (activity == "Workshops") {
    return "workshop";
  } else if (activity == "Bijscholing") {
    return "bijscholing";
  } else {
    console.log("can't match activity " + activity);
    return "Bijscholing";
  }
}

//Alle gemeentes inkleuren volgens regios
export function visualizeMembersByRegion() {
  visualiseRegiosBarchart(main_svg, regio_aantallen_per_jaar);
  makeActivitiesBarchart();
  var towns = getDataOfSelectedYear().regios.filter(value => value.woonplaats !== "");
  colorByRegion(towns);
  addClickListenerToBars();
}

//Alle gemeentes inkleuren volgens regios
export function resetNeighboursVisualization() {
  clicked_neighbour = "";
  neighbours = [];
  if (showAantal) {
    visualizeMembersByValue();
  } else {
    visualizeMembersByRegion();
  }
  visualiseActivitiesOnMap();
}


//Gemeente en buurgementen aanduiden
export function visualizeLocalMembersByRegion(clicked, neighbours) {
  aantalLegende.hidden = true;
  clicked_neighbour = clicked;
  neighbours = neighbours;
  var neighbours_per_year = getNeighboursPerYear(clicked, neighbours);

  // visualize the barchart using the data
  visualiseRegiosBarchart(main_svg, neighbours_per_year);

  var data = extractActivitiesDataForTown(clicked);
  data = extractByActivityType(data);

  visualiseRegionalActivitiesBarchart(activities_svg, data, clicked);

  [main_svg, activities_svg].forEach(function (svg) {
    // add style to initially selected year

    svg.select("#year" + selected_year).selectAll(".bar-rect").style("opacity", 1);
    svg.select("#year" + selected_year).selectAll(".bar-rect").style("stroke-width", "2px");

    // On click: go back to the default visualization
    svg.selectAll(".bar").on("click", function (d) {
      selected_year = this.getAttribute("title");
      visualiseActivitiesOnMap();

      // style the bar to see which year is selected
      main_svg.selectAll(".bar-rect").style("opacity", 0.5);
      main_svg.selectAll(".bar-rect").style("stroke-width", "1px");
      activities_svg.selectAll(".bar-rect").style("opacity", 0.5);
      activities_svg.selectAll(".bar-rect").style("stroke-width", "1px");
      main_svg.select("#year" + selected_year).selectAll(".bar-rect").style("opacity", 1);
      main_svg.select("#year" + selected_year).selectAll(".bar-rect").style("stroke-width", "2px");
      activities_svg.select("#year" + selected_year).selectAll(".bar-rect").style("opacity", 1);
      activities_svg.select("#year" + selected_year).selectAll(".bar-rect").style("stroke-width", "2px");

    });

  });
}



// Draws the correct type of activities on the map for the correct year.
export function visualiseActivitiesOnMap() {
  removePreviousActivities();
  visualiseAllActivitiesOnMap(selected_year);
  //if (selected_activity === "alles") { visualiseAllActivitiesOnMap(selected_year); }
  //else { visualiseActivityTypeOnMap(selected_year, selected_activity); }
}

// Draws all activities on the map, aggregated per gemeente.
// Note - Do not call manually, use visualiseActivitiesOnMap instead.
export function visualiseAllActivitiesOnMap(year) {
  let gemeenten = {};
  let activiteiten = activiteit_aantallen_per_jaar[year - 2008]["activiteiten"];
  activiteiten = activiteiten.filter(data => data.activiteit !== "");
  for (let type of activiteiten) {
    if (selected_activity[translateActivityName(type["activiteit"])] === false) { continue; }
    let steden = type["data"];
    steden.forEach(function (activiteit) {
      if (gemeenten[activiteit["gemeente"]] == null) {
        gemeenten[activiteit["gemeente"]] = activiteit["aantal"];
      }
      else { gemeenten[activiteit["gemeente"]] += activiteit["aantal"] }
    });
  };
  let activity = getSelectedActivity();
  if (activity === "meerdere") { activity = "alles"; }
  Object.keys(gemeenten).forEach(function (gemeente) {
    drawActivity(gemeente, gemeenten[gemeente], activity);
  });
}

/*
// Draws the activities on the map, only for a given activity type.
// Note - Do not call manually, use visualiseActivitiesOnMap instead.
export function visualiseActivityTypeOnMap(year, activityType) {
  let activiteiten = activiteit_aantallen_per_jaar[year - 2008]["activiteiten"];
  activiteiten = activiteiten.filter(data => data.activiteit !== "");
  for (let type of activiteiten) {
    if (type["activiteit"] !== activityType) { continue; }
    let steden = type["data"];
    steden.forEach(function (activiteit) {
      drawActivity(activiteit["gemeente"],
        activiteit["aantal"],
        type["activiteit"]);
    });
  };
}*/


function addClickListenerToBars() {
  [main_svg, activities_svg].forEach(function (svg) {
    svg.selectAll(".bar").on("click", function (d) {
      selected_year = this.getAttribute("title");
      //Afhankelijk van de radio buttons de view van aantallen of regios tonen
      if (!showAantal) {
        var towns;
        for (var [key, tuple] of Object.entries(regio_aantallen_per_jaar)) {
          if (+tuple.jaar == +selected_year) {
            towns = tuple;
          }
        }
        towns = towns.regios.filter(value => value.woonplaats !== "");
        colorByRegion(towns);
        visualiseActivitiesOnMap();
      }
      else {
        var towns = getDataOfSelectedYear().regios.filter(value => value.woonplaats !== "");
        colorByValue(towns, selected_year);
        updateAantalLegendValues();
        visualiseActivitiesOnMap();
      }
      // style the bar to see which year is selected
      main_svg.selectAll(".bar-rect").style("opacity", 0.5);
      main_svg.selectAll(".bar-rect").style("stroke-width", "1px");
      activities_svg.selectAll(".bar-rect").style("opacity", 0.5);
      activities_svg.selectAll(".bar-rect").style("stroke-width", "1px");
      main_svg.select("#year" + selected_year).selectAll(".bar-rect").style("opacity", 1);
      main_svg.select("#year" + selected_year).selectAll(".bar-rect").style("stroke-width", "2px");
      activities_svg.select("#year" + selected_year).selectAll(".bar-rect").style("opacity", 1);
      activities_svg.select("#year" + selected_year).selectAll(".bar-rect").style("stroke-width", "2px");
      updateYearLegend();
    });
    main_svg.select("#year" + selected_year).selectAll(".bar-rect").style("opacity", 1);
    main_svg.select("#year" + selected_year).selectAll(".bar-rect").style("stroke-width", "2px");
    activities_svg.select("#year" + selected_year).selectAll(".bar-rect").style("opacity", 1);
    activities_svg.select("#year" + selected_year).selectAll(".bar-rect").style("stroke-width", "2px");
  });

}


function getDataOfSelectedYear() {
  var data = (regio_aantallen_per_jaar.filter(function (tuple) {
    return +tuple.jaar === +selected_year;
  }));
  if (data.length == 0) {
    console.log("An error occured when matching the selected year with all year data");
  } else {
    return data[0];
  }
}

// Returns the selected activity if unique, or 'geen', 'meerdere' or 'alles'
function getSelectedActivity() {
  var count = 0;
  var activity = "";
  for (var act in selected_activity) {
    if (selected_activity[act]) { activity = act; count += 1 };
  }
  if (count === 1) { return deTranslateActivityName(activity); }
  else if (count === 0) { return "geen" }
  else if (count === 6) { return "alles" }
  else { return "meerdere" }
}