import { regio_aantallen_per_jaar, activiteit_aantallen_per_jaar } from "./main.js";

var voornamen = [];
var leden = [];
var woonplaatsen = [];
var leden_per_jaar_per_woonplaats = [];
var activiteiten = [];
var leden = [];
var activiteiten_per_jaar_per_type = [];


function groupStudentsByYearAndTown() {
  var leden_per_jaar = leden.reduce(function (acc, val) {
    acc[val.sinds_jaar] = acc[val.sinds_jaar] || [];
    acc[val.sinds_jaar].push(val);
    return acc;
  }, Object.create(null));
  for (var [key, value] of Object.entries(leden_per_jaar)) {
    var new_value = value.reduce(function (acc, val) {
      acc[val.woonplaats] = acc[val.woonplaats] || [];
      acc[val.woonplaats].push(val);
      return acc;
    }, Object.create(null));
    leden_per_jaar_per_woonplaats.push({ jaar: key, data: new_value });
  }
  for (let i = 0; i < leden_per_jaar_per_woonplaats.length; i++) {
    var regio_aantallen = [];
    var sum = 0;
    for (let [key, value] of Object.entries(leden_per_jaar_per_woonplaats[i].data)) {
      var regio_id = town_to_region_dict[key];
      if (regio_id == null) {
        console.log("No regio yet for town: " + key);
      }
      regio_aantallen.push({ woonplaats: key, aantal: value.length, regio_id: regio_id });
      sum += value.length;
    }
    regio_aantallen_per_jaar.push({
      jaar: leden_per_jaar_per_woonplaats[i].jaar,
      aantal: sum,
      regios: regio_aantallen
    });
  }
}

function groupActivitiesByYearAndType() {
  var activiteiten_per_jaar = activiteiten.reduce(function (acc, val) {
    acc[val.jaar] = acc[val.jaar] || [];
    acc[val.jaar].push(val);
    return acc;
  }, Object.create(null));
  for (var [key, value] of Object.entries(activiteiten_per_jaar)) {
    var new_value = value.reduce(function (acc, val) {
      acc[val.type] = acc[val.type] || [];
      acc[val.type].push(val);
      return acc;
    }, Object.create(null));
    activiteiten_per_jaar_per_type.push({ jaar: key, data: new_value });
  }

  for (let i = 0; i < activiteiten_per_jaar_per_type.length; i++) {
    var activiteit_aantallen = [];
    var sum = 0;
    for (let [key, value] of Object.entries(activiteiten_per_jaar_per_type[i].data)) {
      var gemeente_bereik = value.reduce(function (acc, val) {
        acc[val.gemeente] = acc[val.gemeente] || [];
        acc[val.gemeente].push(val);
        return acc;
      }, Object.create(null));

      var gemeente_aantallen = [];
      var gemeente_som = 0;
      for (let [key2, value2] of Object.entries(gemeente_bereik)) {
        var aantal = 0;
        value2.forEach(activity => aantal += activity.bereik);
        gemeente_som += aantal;
        gemeente_aantallen.push({ gemeente: key2, aantal: aantal });
      }
      sum += gemeente_som;
      activiteit_aantallen.push({ activiteit: key, aantal: gemeente_som, data: gemeente_aantallen });
    }
    activiteit_aantallen_per_jaar.push({
      jaar: activiteiten_per_jaar_per_type[i].jaar,
      aantal: sum,
      activiteiten: activiteit_aantallen
    });
  }
}

export function storeStudentDataInArrays(csv_data) {
  csv_data.forEach(function (row) {
    // convert strings to integers
    row.Lid_Sinds = +row.Lid_Sinds;
    row.Lid_Tot = +row.Lid_Tot;
    row.Aantal_Jaren_Lid = +row.Aantal_Jaren_Lid;
    row.Postcode = +row.Postcode;
    row.Woonplaats = (row.Woonplaats).toLowerCase().replaceAll(" ", "-");
    // extract the requested column value from the row
    voornamen.push(row.Voornaam);
    woonplaatsen.push(row.Woonplaats);
    // extract tuples
    leden.push({ sinds_jaar: row.Lid_Sinds, duratie: row.Aantal_Jaren_Lid, woonplaats: row.Woonplaats, regio_id: town_to_region_dict[row.Woonplaats] });
  });
  sortStudentsByYearAndTown();
  groupStudentsByYearAndTown();
  initializeGeojsonFiles(woonplaatsen.unique().filter(value => value !== ""));
}

export function storeActivitiesDataInArrays(csv_data) {
  csv_data.forEach(function (row) {
    row.Jaar = +row.Jaar;
    row.Maand = +row.Maand;
    row.Bereik = +row.Bereik;
    row.Gemeente = (row.Gemeente).toLowerCase().replaceAll(" ", "-");
    activiteiten.push({ jaar: row.Jaar, type: row.Type, gemeente: row.Gemeente, bereik: row.Bereik });
  });
  sortActivitiesByYearAndType();
  groupActivitiesByYearAndType();
}

export function getNeighboursPerYear(clicked, neighbours) {
  var neighbours_per_year = [];
  regio_aantallen_per_jaar.forEach(function (tuple) {
    var clicked_data = tuple.regios.filter(regio => regio.woonplaats === clicked);
    var neighbours_total = 0;
    neighbours.forEach(function (a_neighbour) {
      var town_data = tuple.regios.filter(regio => regio.woonplaats === a_neighbour);
      if (town_data.length !== 0) {
        neighbours_total += town_data[0].aantal;
      }
    });
    var regios = [];
    var remaining_total = tuple.aantal;
    if (clicked_data.length !== 0) {
      remaining_total -= clicked_data[0].aantal;
      regios.push({ woonplaats: clicked, aantal: clicked_data[0].aantal, regio_id: 11 });
    }
    else {
      regios.push({ woonplaats: clicked, aantal: 0, regio_id: 11 });
    }
    regios.push({ woonplaats: "neigbours", aantal: neighbours_total, regio_id: 10 });
    remaining_total -= neighbours_total;
    regios.push({ woonplaats: "", aantal: remaining_total, regio_id: 0 });
    neighbours_per_year.push({ jaar: tuple.jaar, aantal: tuple.aantal, regios: regios });
  });
  return neighbours_per_year;
}

function sortStudentsByYearAndTown() {
  leden.sort(function (a, b) {
    if (a.sinds_jaar == b.sinds_jaar) {
      return (a.woonplaats > b.woonplaats) ? 1 : -1;
    }
    else {
      return (a.sinds_jaar > b.sinds_jaar) ? 1 : -1;
    }
  });
}

function sortActivitiesByYearAndType() {
  activiteiten.sort(function (a, b) {
    if (a.jaar == b.jaar) {
      return (a.type > b.type) ? 1 : -1;
    }
    else {
      return (a.jaar > b.jaar) ? 1 : -1;
    }
  });
}

export function extractActivitiesDataForTown(clicked) {
  var data = [];
  activiteit_aantallen_per_jaar.forEach(function (activiteit_aantallen) {
    var year_data = [];
    var sum = 0;
    activiteit_aantallen["activiteiten"].forEach(function (tuple) {
      if (tuple.data !== "") {
        var relevant_data = tuple.data.filter(value => value.gemeente == clicked);
        if (relevant_data.length > 0) {
          sum += relevant_data[0].aantal;
          year_data.push({ activiteit: tuple.activiteit, aantal: relevant_data[0].aantal });
        }
      }
    });
    data.push({ jaar: activiteit_aantallen.jaar, aantal: sum, activiteiten: year_data });
  });
  return data;
}

// functionality to replace all regex string with another string
String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

// functionality to find all unique values in an array
Array.prototype.contains = function (v) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] === v) return true;
  }
  return false;
};

Array.prototype.unique = function () {
  var arr = [];
  for (var i = 0; i < this.length; i++) {
    if (!arr.contains(this[i])) {
      arr.push(this[i]);
    }
  }
  return arr;
};

