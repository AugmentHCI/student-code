d3.csv("/data/OverzichtLeerlingen.csv").then(function (data) {

  // extract column of data
  var voornamen = [];
  var lid_duratie_sinds_jaar = [];

  // process each row
  data.forEach(function (d, i) {

    // convert strings to integers
    d.Lid_Sinds = +d.Lid_Sinds;
    d.Lid_Tot = +d.Lid_Tot;
    d.Aantal_Jaren_Lid = +d.Aantal_Jaren_Lid;
    d.Postcode = +d.Postcode;

    // extract the requested column value from the row
    voornamen.push(d.Voornaam);

    // extract tuples
    lid_duratie_sinds_jaar.push({ sinds_jaar: d.Lid_Sinds, duratie: d.Aantal_Jaren_Lid });
  });

  // sorts by year of enrollment first, and by duration of membership second
  lid_duratie_sinds_jaar.sort(function (a, b) {
    if (a.sinds_jaar == b.sinds_jaar) {
      return (a.duratie > b.duratie) ? 1 : -1;
    } else {
      return (a.sinds_jaar > b.sinds_jaar) ? 1 : -1;
    }
  });


  var eerst_jaar = lid_duratie_sinds_jaar[0].sinds_jaar;

  leden_per_jaar = lid_duratie_sinds_jaar.reduce(function (acc, val) {
    acc[val.sinds_jaar] = acc[val.sinds_jaar] || [];
    acc[val.sinds_jaar].push(val);
    return acc;
  }, Object.create(null));

  var aantal_per_jaar = [];
  for (let [key, value] of Object.entries(leden_per_jaar)) {
    aantal_per_jaar.push({
      jaar: key, duraties: value.reduce(function (acc, val) {
        acc[val.duratie] = acc[val.duratie] || 0;
        acc[val.duratie] = acc[val.duratie] + 1;
        return acc;
      }, Object.create(null))
    });
  }

  console.log("group", aantal_per_jaar);


  var svg = d3
    .select("body")
    .append("svg")
    .attr("id", "svg")
    .attr("width", "100%")
    .attr("height", "100%");


  var myColor = d3.scaleLinear().domain([0, 10, 120])
    .range(["red", "green", "green"]);
  var logScale = d3.scaleLinear()
    .domain([0, 103])
    .range([8, 25]);

  aantal_per_jaar.forEach(element => {
    for (let [key, value] of Object.entries(element.duraties)) {
      // nodes
      svg.append("svg:circle")
        .attr("cx", 50 + (element.jaar - eerst_jaar) * 40)
        .attr("cy", 500 - key * 40)
        .attr("r", logScale(value / 3.14 / value))
        .attr("fill", myColor(key * 10 - (2020 - element.jaar - key) * 2))
        .style("fill-opacity", 0.9);

      // value for each node
      svg.append("text")
        .text(value)
        .attr("x", 50 + (element.jaar - eerst_jaar) * 40)
        .attr("y", 503 - key * 40)
        .style("font-size", "10px")
        .attr("text-anchor", "middle");

      // x axis
      svg.append("text")
        .text(key)
        .attr("x", 25)
        .attr("y", 503 - key * 40)
        .style("font-size", "10px")
        .attr("text-anchor", "middle");
    }
    // y axis
    svg.append("text")
      .text(element.jaar)
      .attr("x", 50 + (element.jaar - eerst_jaar) * 40)
      .attr("y", 505)
      .style("font-size", "10px")
      .attr("text-anchor", "middle");
  });


  /*svg
.selectAll(".lines")
.data(lid_duratie_sinds_jaar)
.enter()
.append("svg:line")
.attr("x1", function (d, i) { return 100 + (d.sinds_jaar - eerst_jaar) * 20; })
.attr("x2", function (d, i) { return 100 + (d.sinds_jaar - eerst_jaar + d.duratie) * 20; })
.attr("y1", function (d, i) { return 50 + i; })
.attr("y2", function (d, i) { return 50 + i; })
.attr("class", "line")
.style("stroke", "black")
.style("stroke-opacity", "1")
.style("stroke-width", "1px");*/
});


