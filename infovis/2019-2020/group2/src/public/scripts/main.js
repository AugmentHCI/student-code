const buckets = {};
const maps = {};
const scatters = {};

function throttle(fn) {
  const event = d3.event;
  requestAnimationFrame(function () {
    d3.event = event;
    fn();
  });
}

(() => {
  const margin = {
    top: 20,
    bottom: 35,
    left: 70,
    right: 30,
  };

  buckets.createBuckets = function (title, axisTitle, svgContainer, nbIntervals, data, accessor, minIntervals = nbIntervals, maxIntervals = nbIntervals, fill, stroke, zeroLine = false, log = false) {
    let currentNbIntervals = -1;
    const svg = svgContainer;
    const height = +svg.style('height').replace('px', '') - margin.top - margin.bottom;
    const width = +svg.style('width').replace('px', '') - margin.left - margin.right;

    const bucketView = svg
      .append('g')
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const lineView = svg
      .append('g')
      .classed('lines', true)
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const zeroLineView = svg
      .append('g')
      .classed('zero-line', true)
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const yAxisView = svg
      .append('g')
      .classed('yScale', true)
      .attr('transform', `translate(${20},${margin.top})`);

    const xAxisView = svg
      .append('g')
      .classed('xScale', true)
      .attr('transform', `translate(${margin.left},${height + margin.top})`);

    svg.append('text')
      .classed('title', true)
      .attr('x', margin.left + width / 2)
      .text(title)


    svg.append('text')
      .classed('axis-title-y', true)
      .attr("transform", `translate(0,${margin.top + height / 2})rotate(-90)`)
      .text(axisTitle);

    const [dataMin, dataMax] = d3.extent(data.map(d => d.values.map(dd => {
      const result = accessor(dd);
      if (result === Infinity || result === -Infinity) return null;
      return result;
    })).flat());

    const yScale = d3.scaleBand()
      .range([height, 0])
      .paddingInner(0.2)
      .paddingOuter(0.4);
    const xBandScale = d3.scaleBand()
      .domain(data.map(d => d.year))
      .range([0, width])
      .paddingInner(0.2);
    const midPointScale = d3.scalePoint()
      .domain(xBandScale.domain())
      .range(xBandScale.range())
      .padding(xBandScale.paddingInner());
    const identityScale = d3.scaleIdentity(xBandScale.range());
    const fishEyeStretchScale = d3.fisheye.scale(identityScale.copy).distortion(0);
    const fishEyeXScale = d3.fisheye.scale(midPointScale.copy).distortion(0);

    const xAxis = d3.axisBottom(fishEyeXScale);

    const groupedDatePerYear = {};
    const highlightedCountries = new Map();

    const enteredBuckets = new Set();
    const enteredBars = new Set();
    const bucketEnterListeners = [];
    const barEnterListeners = [];

    function restore() {
      fishEyeXScale.distortion(0);
      fishEyeStretchScale.distortion(0);
      updateXAxis(true);
      drawBuckets(true);
      drawPath(true);
    }

    function increaseNbIntervals() {
      setNbIntervals(currentNbIntervals + 1);
    }

    function decreaseNbIntervals() {
      setNbIntervals(currentNbIntervals - 1);
    }

    function _setNbIntervals(nbIntervals) {
      if (nbIntervals === currentNbIntervals) return;
      currentNbIntervals = Math.min(Math.max(nbIntervals, minIntervals), maxIntervals);

      const qScale = d3.scaleQuantize() // data point => band index
        .domain([dataMin, dataMax])
        .range(d3.range(currentNbIntervals));
      yScale.domain(qScale.range());

      if (zeroLine) {
        const y = yScale(qScale(0)) + yScale.bandwidth() / 2;
        zeroLineView.selectAll('path')
          .data([[[0, y], [width, y]]])
          .join('path')
          .attr('d', d3.line());
      }

      let yTicks = qScale.range().map(i => d3.mean(qScale.invertExtent(i)));
      if (log) yTicks = yTicks.map(d => Math.pow(d, 10));
      const yAxis = d3.axisRight(yScale.copy().domain(yTicks));
      yAxisView.call(yAxis.tickFormat(log ? d3.format('.2s') : d3.formatPrefix(".1", 1e2)));

      data.forEach(yearData => {
        const groupedData = [];
        for (let i = 0; i < currentNbIntervals; ++i) {
          groupedData.push([]);
        }
        yearData.values.forEach(d => {
          const i = qScale(accessor(d));
          groupedData[i].push(d);
        });
        groupedDatePerYear[yearData.year] = groupedData;
      });

      const highlights = [];
      highlightedCountries.forEach((color, country) => {
        highlightCountry(country, false);
        highlights.push({ country, color });
      })
      _drawBuckets();
      highlights.forEach(h => highlightCountry(h.country, true));
      _drawPath();
    }

    function focus(x, transitions = false) {
      const mouseX = Math.min(Math.max(x - margin.left, 0), width);
      fishEyeStretchScale.distortion(10).focus(mouseX);
      fishEyeXScale.distortion(10).focus(mouseX);
      updateXAxis(transitions);
      drawBuckets(transitions);
      drawPath(transitions);
    }

    function _updateXAxis(transitions) {
      if (transitions) {
        xAxisView.transition().duration(500).call(xAxis);
      } else {
        xAxisView.call(xAxis);
      }
    }

    function _drawBuckets(transitions) {
      bucketView.selectAll('g.buckets')
        .data(data, d => d.year)
        .join(enter => enter
          .append('g')
          .classed('buckets', true)
        )
        .each(function (d) {
          drawBucket(d3.select(this), d.year, transitions);
        });
    }

    function drawBucket(group, year, transitions) {
      const maxWidth = xBandScale.bandwidth();
      const groupedData = groupedDatePerYear[year];
      const maxBucket = d3.max(groupedData, i => i.length);

      const distortedBounds = i => {
        const w = (groupedData[i].length / maxBucket) * maxWidth;
        const midX = midPointScale(year);
        const minX = midX - w / 2;
        const maxX = midX + w / 2;
        return [fishEyeStretchScale(minX), fishEyeStretchScale(maxX)];
      }

      const distortedWidth = i => {
        const [minX, maxX] = distortedBounds(i);
        return maxX - minX;
      }

      const distortedX = i => distortedBounds(i)[0];

      const [absMinX, absMaxX] = (() => {
        const midX = midPointScale(year);
        return [fishEyeStretchScale(midX - maxWidth / 2), fishEyeStretchScale(midX + maxWidth / 2)];
      })();

      group.selectAll('rect.bucket-background')
        .data([year])
        .join(
          enter => enter.append('rect')
            .classed('bucket-background', true)
            .attr('y', -margin.top)
            .attr('height', height + margin.bottom + 20)
            .attr('opacity', 0)
            .on('mouseenter', () => {
              const entered = onBucket(year);
              enteredBuckets.add(year);
              if (!entered) notifyBucketEnter(year, true);
            })
            .on('mouseleave', () => {
              const entered = onBucket(year);
              enteredBuckets.delete(year);
              if (entered) notifyBucketEnter(year, false);
            })
        )
        .attr('x', absMinX)
        .attr('width', absMaxX - absMinX)

      group.selectAll('rect.bar')
        .data(groupedData)
        .join(
          enter => enter.append('rect')
            .classed('bar', true)
            .attr('rx', 1)
            .attr('ry', 1)
            .on('mouseenter', d => {
              const entered = onBucket(year);
              enteredBars.add(year);
              if (!entered) notifyBucketEnter(year, true);
              notifyBarEnter(d.map(v => v.countryCode));
            })
            .on('mouseleave', d => {
              const entered = onBucket(year);
              enteredBars.delete(year);
              if (entered) notifyBucketEnter(year, false);
              notifyBarEnter(d.map(v => v.countryCode), false);
            })
        )
        .each((d, i) => {
          d._x = distortedX(i);
          d._width = distortedWidth(i);
          d._y = yScale(i);
          d._height = yScale.bandwidth();
        })
        .call(sel => {
          if (transitions) {
            sel.transition()
              .duration(500)
              .attr('x', (_, i) => distortedX(i))
              .attr('width', (_, i) => distortedWidth(i))
          } else {
            sel.attr('x', (_, i) => distortedX(i))
              .attr('width', (_, i) => distortedWidth(i));
          }
        })
        .attr('height', yScale.bandwidth())
        .attr('y', (_, i) => yScale(i));
    }

    function highlightCountry(country, highlight) {
      if (highlight) highlightedCountries.set(country, fill);
      else highlightedCountries.delete(country);

      bucketView.selectAll('rect.bar')
        .filter(d => d.some(e => e.countryCode === country))
        .classed(country, highlight)
        .classed('selected-country', highlight)
        .attr('fill', highlight ? fill : null);

    }

    function _drawPath(transitions) {
      bucketView.selectAll('rect.bar')
        .attr('opacity', highlightedCountries.size > 0 ? 0.5 : 1);
      const linePoints = [];
      highlightedCountries.forEach((color, country) => {
        const points = [];
        bucketView.selectAll(`rect.${country}`).sort((a, b) => a.year < b.year ? -1 : (a.year > b.year ? 1 : 0)).each(function (d) {
          const y = d._y;
          const h = d._height;
          const x = d._x;
          const w = d._width
          points.push({
            x: x + w / 2,
            y: y + h / 2
          });
        });
        linePoints.push({
          color,
          points
        });
      });

      const l = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveMonotoneX);

      lineView.selectAll('g.line>path')
        .data(linePoints)
        .join(
          enter => enter.append('g')
            .classed('line', true)
            .append('path')
            .attr('fill', 'none')
            .attr('stroke-width', 2)
        )
        .call(sel => {
          if (transitions) {
            sel.transition().duration(500).attr('d', d => l(d.points));
          } else sel.attr('d', d => l(d.points));
        })
        .attr('stroke', d => d.color);
    }

    function highlight(country, highlight = true) {
      highlightCountry(country, highlight);
      drawPath();
    }

    function onBucket(year) {
      return enteredBuckets.has(year) || enteredBars.has(year);
    }

    function onBucketEnter(listener) {
      bucketEnterListeners.push(listener);
    }

    function onBarEnter(listener) {
      barEnterListeners.push(listener);
    }

    function notifyBucketEnter(year, enter) {
      bucketEnterListeners.forEach(l => l(year, enter));
    }

    function notifyBarEnter(countries, enter) {
      barEnterListeners.forEach(l => l(countries, enter));
    }

    function drawBuckets(transitions = false) {
      throttle(() => _drawBuckets(transitions));
    }

    function drawPath(transitions = false) {
      throttle(() => _drawPath(transitions));
    }

    function updateXAxis(transitions = false) {
      throttle(() => _updateXAxis(transitions));
    }

    function setNbIntervals(nbIntervals) {
      throttle(() => _setNbIntervals(nbIntervals));
    }

    setNbIntervals(nbIntervals);
    updateXAxis();

    return {
      drawBuckets,
      highlight,
      setNbIntervals,
      increaseNbIntervals,
      decreaseNbIntervals,
      onBucketEnter,
      onBarEnter,
      focus,
      restore,
    }
  }
})();

(() => {
  maps.createMap = function (svgContainer, countries, data, countryCodes) {
    const width = +svgContainer.style('width').replace('px', '');
    const height = +svgContainer.style('height').replace('px', '');
    const margin = 5;
    const domainTemp = d3.extent(data.map(d => d.values.map(dd => dd.absTempDiff)).flat());
    const domainCO = d3.extent(data.map(d => d.values.map(dd => dd.COTWEE > 0 ? dd.COTWEE : null)).flat());
    domainTemp[0] = Math.floor(domainTemp[0]);
    domainTemp[1] = Math.ceil(domainTemp[1]);
    domainCO[0] = Math.floor(domainCO[0]);
    domainCO[1] = Math.ceil(domainCO[1]);

    const tempScale = d3.scaleLinear().domain(domainTemp).range([0, 1]);
    const coScale = d3.scaleLog().domain(domainCO).range([0, 1]);

    const tempColor = t => d3.interpolateOrRd(tempScale(t))
    const coColor = t => d3.interpolatePuBu(coScale(t));

    const projection = d3.geoNaturalEarth1()
      .fitExtent([
        [margin, margin],
        [width - margin, height - margin]
      ], {
        type: 'FeatureCollection',
        features: countries,
      });

    const path = d3.geoPath()
      .projection(projection);

    const selectedCountries = [];

    const view = svgContainer.append('g');
    const landView = view.append('g').classed('land', true);

    const yearToIndex = d3.scaleOrdinal()
      .domain(data.map(d => d.year))
      .range(d3.range(data.length));

    const zoom = d3.zoom()
      .extent([
        [0, 0],
        [width, height]
      ])
      .scaleExtent([1, 4])
      .translateExtent([
        [0, 0],
        [width, height]
      ])
      .on('zoom', () => view.attr('transform', d3.event.transform));

    svgContainer.call(zoom);

    const countrySelectionListeners = [];

    var legend = svgContainer.append("defs")
      .append("svg:linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "100%")
      .attr("y2", "100%")
      .attr("spreadMethod", "pad");

    const legendAxisView = svgContainer.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(9,${height - 25})`);

    const legendTitleView = svgContainer.append('g').attr("transform", `translate(9,${height - 25})`).append('text')
      .attr('transform', 'translate(100,-30)')
      .classed('legend-title', true);

    function updateLegend(temp = true) {
      legend.selectAll('stop')
        .data([0, .33, .66, 1])
        .join(
          enter => enter.append('stop')
            .attr('offset', d => `${d * 100}%`)
        )
        .attr('stop-color', d => temp ? d3.interpolateOrRd(d) : d3.interpolatePuBu(d));

      const y = (temp ? d3.scaleLinear() : d3.scaleLog()).range([0, 200]);
      y.domain(temp ? domainTemp : domainCO).nice();
      const yAxis = d3.axisBottom(y)
      .ticks(5)
      .tickFormat(d3.format('.2s'));
      legendAxisView.call(yAxis);
      legendTitleView.text(temp ? `Anomaly (°C)` : `Emission (Tonnes)`)
    }

    function setLegendYear(year, temp) {
      legendTitleView.text(temp ? `Anomaly (°C) - ${year}` : `Emission (Tonnes) - ${year}`);
    }

    svgContainer.append("rect")
      .attr('x', 5).attr('y', height - 55)
      .attr("width", 200)
      .attr("height", 20)
      .style("fill", "url(#gradient)")
      .attr("transform", "translate(5,10)");

    landView.selectAll('path.country')
      .data(countries)
      .join('path')
        .classed('country', true)
        .classed('no-data', true)
        .attr('fill', 'gray')
        .attr('d', path)
        .attr('id', d => d.id)
      .filter(d => countryCodes.includes(d.id))
      .classed('no-data', false)
      .on('click', function (d) {
        const country = d3.select(this);
        const cc = d.id;
        const name = d.properties.name;
        if (selectedCountries.includes(cc)) {
          country.classed('selected', false);
          selectedCountries.splice(selectedCountries.indexOf(cc), 1);
          notifyCountrySelection(cc, false, name);
        } else {
          country.classed('selected', true);
          while (selectedCountries.length > 0) {
            const [deletedCountry] = selectedCountries.splice(0, 1);
            d3.select(`#${deletedCountry}`).classed('selected', false);
            notifyCountrySelection(deletedCountry, false, name);
          }
          selectedCountries.push(cc);
          notifyCountrySelection(cc, true, name);
        }
      });

    function drawHeatmap(year, temp = true) {
      const heatData = data[year ? yearToIndex(year) : 0].values;

      heatData.forEach(hd => {
        const countryCode = hd.countryCode;
        const t = hd[temp ? 'absTempDiff' : 'COTWEE'];
        const scale = temp ? tempColor : coColor;
        landView.select(`#${countryCode}`)
          .attr('fill', t ? scale(t) : 'white');
      });

    }

    function highlightCountries(countries, highlight = true) {
      landView.selectAll('.country').classed('no-highlight', highlight);
      countries.forEach(country => landView.selectAll(`#${country}`).classed('highlight', highlight).classed('no-highlight', false));
    }

    function onCountrySelection(listener) {
      countrySelectionListeners.push(listener);
    }

    function notifyCountrySelection(country, selected, countryName) {
      countrySelectionListeners.forEach(l => l(country, selected, countryName));
    }

    return {
      drawHeatmap,
      onCountrySelection,
      highlightCountries,
      updateLegend,
      setLegendYear
    }
  }
})();

(() => {
  const margin = {
    top: 20,
    bottom: 30,
    left: 60,
    right: 20,
  };

  scatters.createScatter = function(svgContainer, title, axisTitle, data) {
    const svg = svgContainer;
    const height = +svg.style('height').replace('px', '') - margin.top - margin.bottom;
    const width = +svg.style('width').replace('px', '') - margin.left - margin.right;

    const dotAvgView = svg
      .append('g')
        .attr('fill', 'black')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const lineAvgView = svg
      .append('g')
      .classed('line', true)
      .attr('stroke', 'black')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const yAxisView = svg
      .append('g')
      .classed('yScale', true)
      .attr('transform', `translate(${60},${margin.top})`);

    const xAxisView = svg
      .append('g')
      .classed('xScale', true)
      .attr('transform', `translate(${margin.left},${height + margin.top})`);

    const t = svg.append('text')
      .classed('title', true)
      .attr('x', margin.left + width / 2)
      .attr('y', 10)
      .text(title)


    svg.append('text')
      .classed('axis-title-y', true)
      .attr("transform", `translate(10,${margin.top + height / 2})rotate(-90)`)
      .text(axisTitle);

    let seasonNb = 0;

    const minY = 1901;
    const maxY = 2013;

    const xLabelScale = d3.scaleLinear()
      .domain([minY, maxY])
      .range([0, width]);

    const xScale = d3.scaleLinear()
      .domain([minY, maxY])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .range([height, 0]);

    const yAxis = d3.axisLeft(yScale);

    xAxisView.call(d3.axisBottom(xLabelScale).tickFormat(d3.format('d')));

    const indexToSeason = d3.scaleOrdinal()
      .domain(d3.range(4))
      .range(['spring', 'summer', 'fall', 'winter'])

    const regression = d3.regressionLoess()
      .x(d => d.year)
      .bandwidth(1);

    const line = d3.line()
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]));

    function updateYAxis(countryCode, seasonNb) {
      const season = indexToSeason(seasonNb);
      const bounds = data[countryCode] ? data[countryCode].bounds[season] : [0, 0];

      yScale.domain(bounds).nice();
      yAxisView.call(yAxis);
    }

    let cc;
    let c;

    function draw(countryCode) {
      cc = countryCode;
      const season = indexToSeason(seasonNb);
      const avgData = data[countryCode] ? data[countryCode].values : [];
      updateYAxis(countryCode, seasonNb);

      dotAvgView.selectAll('circle')
        .data(avgData)
        .join(
          enter => enter.append('circle')
            .attr('r', 1)
        )
          .attr('cx', d => xScale(d.year))
          .attr('cy', d => yScale(d[season]));

      regression.y(d => d[season]);
      const regAvg = regression(avgData);
    
      lineAvgView.selectAll('path.reg')
        .data([regAvg])
        .join(
          enter => enter.append('path')
            .classed('reg', true)
        )
        .attr('d', line);
    }

    function setTitle(country) {
      c = country;
      const s = indexToSeason(seasonNb);
      t.text(`${s.charAt(0).toUpperCase() + s.slice(1)} Temperature - ${country}`);
    }

    function setSeason(newSeasonNb) {
      seasonNb = newSeasonNb;
    }

    d3.selectAll('input[type=radio]').on('click', function(_, i) {
      setSeason(i);
      if (c) {
        setTitle(c);
      }
      if (cc) {
        draw(cc)
      };
    }).filter((_, i) => i == 0).property('checked', true);

    return {
      draw,
      setSeason,
      setTitle,
    }
  }
})();

function parseScatterData(data) {
  const acc = ['spring', 'summer', 'fall', 'winter'];
  const obj = d3.nest()
    .key(d => d.country_code)
    .sortValues((a, b) => {
      if (+a.year < +b.year) return -1;
      if (+a.year > +b.year) return 1;
      return 0;
    })
    .rollup(v => v.map(vv => {
      const res = {};
      acc.forEach(a => res[a] = +vv[a]);
      res.year = +vv.Year;
      return res;
    }))
    .object(data);
  const result = {};
  d3.keys(obj).forEach(countryCode => {
    result[countryCode] = {};
    result[countryCode].values = obj[countryCode];
    const bounds = {};
    acc.forEach(a => {
      const b = d3.extent(obj[countryCode].map(d => d[a]));
      bounds[a] = [Math.floor(b[0]), Math.ceil(b[1])];
    });
    result[countryCode].bounds = bounds;
  });
  return result;
}

function parseCountryCodes(data) {
  return d3.nest()
    .key(d => d.country_code)
    .entries(data)
    .map(d => d.key);
}

function parseData(data) {
  return d3.nest()
    .key(d => d.Year)
    .entries(data)
    .map(obj => {
      return {
        year: +obj.key,
        values: obj.values.map(o => {
          const {
            AbsTempDiff,
            AverageAnnualTemp,
            COTWEE,
            Country,
            country_code,
          } = o;
          return {
            absTempDiff: +AbsTempDiff,
            averageAnnualTemp: +AverageAnnualTemp,
            COTWEE: +COTWEE > 0 ? + COTWEE : null,
            country: Country,
            countryCode: country_code,
          };
        })
      }
    });
}

function createVisualization(parsedData, scatterParsedData, countries, countryCodes) {
  const bucketsContainer = d3.select('#buckets-container');
  const container1 = bucketsContainer.select('#buckets1');
  const container2 = bucketsContainer.select('#buckets2');
  const scatterContainer = d3.select('#scatter');

  const buckets1 = buckets.createBuckets("CO₂ emissions", "Emission (Tonnes)", container1, 14, parsedData, d => Math.log10(d.COTWEE), 10, 20, '#306EA5', '#306EA5', false, true);
  const buckets2 = buckets.createBuckets("Temperature anomalies", "Anomaly (˚C)", container2, 14, parsedData, d => d.absTempDiff, 10, 20, '#DE6E50', '#DE6E50', true);

  const bucketsArr = [buckets1, buckets2];

  let mouseDown = false;
  let transitionDone = false;

  const getX = () => d3.mouse(bucketsContainer.node())[0];

  bucketsContainer.on('wheel', function () {
    const up = d3.event.deltaY < 0;
    bucketsArr.forEach(b => up ? b.increaseNbIntervals() : b.decreaseNbIntervals());
  });

  bucketsContainer.on('mousedown', () => mouseDown = true);
  bucketsContainer.on('mouseup', () => mouseDown = false);

  bucketsContainer.on('mouseenter', function () {
    const x = getX();
    bucketsArr.forEach(b => b.focus(x, true));
    setTimeout(() => transitionDone = true, 500);
  });

  bucketsContainer.on('mousemove', function () {
    if (!transitionDone || mouseDown) return;
    const x = getX();
    bucketsArr.forEach(b => b.focus(x));
  });

  bucketsContainer.on('mouseleave', function () {
    mouseDown = false;
    transitionDone = false;
    bucketsArr.forEach(b => b.restore());
  });

  const mapContainer = d3.select('#map');
  const map = maps.createMap(mapContainer, countries, parsedData, countryCodes);
  const scatter = scatters.createScatter(scatterContainer, 'Season Temperature', 'Temperature (°C)', scatterParsedData);

  map.onCountrySelection((country, selected, name) => {
    bucketsArr.forEach(b => b.highlight(country, selected));
    scatter.draw(country);
    scatter.setTitle(name);
  });

  bucketsArr.forEach((b, i) => {
    b.onBucketEnter(year => map.drawHeatmap(year, i));
    b.onBucketEnter(year => map.setLegendYear(year, i == 1));
    b.onBarEnter(map.highlightCountries);
    b.drawBuckets();
  });

  container1.on('mouseenter', () => map.updateLegend(false));
  container2.on('mouseenter', () => map.updateLegend(true));

  let season = 0;

  scatterContainer.on('click', () => {
    scatter.setseason(++season);
  })
}

// main function
(async () => {
  const loadedData = await d3.csv('../assets/data/merged_wrt_average_temp.csv');
  const loadedMapData = await d3.json('../assets/data/world-countries.topojson');
  const loadedAvgTemp = await d3.csv('../assets/data/avg_temp.csv');

  const parsedData = parseData(loadedData);
  const parsedAvgTemp = parseScatterData(loadedAvgTemp);

  const countries = topojson.feature(loadedMapData, loadedMapData.objects.countries1).features;
  const countryCodes = parseCountryCodes(loadedData);

  createVisualization(parsedData, parsedAvgTemp, countries, countryCodes);
})();