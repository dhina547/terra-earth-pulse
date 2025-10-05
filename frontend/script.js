const yearSlider = document.getElementById("year-slider");
const yearLabel = document.getElementById("year-label");
const generateButton = document.getElementById("generate-button");
const statusDiv = document.getElementById("status");
const chartCtx = document.getElementById("timeSeriesChart").getContext("2d");
const globeDiv = document.getElementById("globe");

let timeSeriesChart; // Variable to hold the chart instance

// Update the label when the slider moves
yearSlider.addEventListener("input", (event) => {
  yearLabel.textContent = event.target.value;
});

// Main function to generate both visualizations
generateButton.addEventListener("click", async () => {
  const year = yearSlider.value;
  generateButton.disabled = true;
  statusDiv.textContent = `Loading data for ${year}...`;

  if (timeSeriesChart) {
    timeSeriesChart.destroy();
  }
  Plotly.purge(globeDiv);

  try {
    const timeSeriesApiUrl = `http://127.0.0.1:5000/api/timeseries?year=${year}`;
    const timeSeriesResponse = await fetch(timeSeriesApiUrl);
    if (!timeSeriesResponse.ok)
      throw new Error("Failed to fetch time-series data");
    const timeSeriesData = await timeSeriesResponse.json();
    createTimeSeriesGraph(timeSeriesData, year);

    const mapApiUrl = `http://127.0.0.1:5000/api/annual_map?year=${year}`;
    const mapResponse = await fetch(mapApiUrl);
    if (!mapResponse.ok) throw new Error("Failed to fetch map data");
    const mapData = await mapResponse.json();
    create3DGlobe(mapData, year);

    statusDiv.textContent = `Visualizations for ${year} complete!`;
  } catch (error) {
    console.error("Error:", error);
    statusDiv.textContent = `Failed to generate visualizations for ${year}. Check console for details.`;
  } finally {
    generateButton.disabled = false;
  }
});

// Function to create the 2D line graph
function createTimeSeriesGraph(data, year) {
  // --- THIS IS THE UPDATED PART ---
  // Calculate min and max for the y-axis to create a stable range
  const dataMin = Math.min(...data.averages);
  const dataMax = Math.max(...data.averages);
  // Add a little padding to the top and bottom
  const axisMin = dataMin * 0.99;
  const axisMax = dataMax * 1.01;

  timeSeriesChart = new Chart(chartCtx, {
    type: "line",
    data: {
      labels: data.months,
      datasets: [
        {
          label: `Monthly Average CO for ${year}`,
          data: data.averages,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `CO Concentration Trend - ${year}`,
        },
      },
      scales: {
        y: {
          min: axisMin, // Set the minimum value for the axis
          max: axisMax, // Set the maximum value for the axis
          ticks: {
            // This function formats the y-axis labels
            callback: function (value, index, values) {
              return value.toExponential(2); // Format as scientific notation
            },
          },
        },
      },
    },
  });
}

// Function to create the 3D globe
function create3DGlobe(data, year) {
  const lonRad = data.lon.map((d) => (d * Math.PI) / 180);
  const latRad = data.lat.map((d) => (d * Math.PI) / 180);
  const xGrid = [],
    yGrid = [],
    zGrid = [];

  for (let i = 0; i < latRad.length; i++) {
    const xRow = [],
      yRow = [];
    for (let j = 0; j < lonRad.length; j++) {
      xRow.push(Math.cos(latRad[i]) * Math.cos(lonRad[j]));
      yRow.push(Math.cos(latRad[i]) * Math.sin(lonRad[j]));
    }
    xGrid.push(xRow);
    yGrid.push(yRow);
    zGrid.push(Array(lonRad.length).fill(Math.sin(latRad[i])));
  }

  const flatGrid = data.grid.flat().filter((v) => v !== null);
  const vmin = Math.min(...flatGrid);
  const vmax = Math.max(...flatGrid);

  const plotData = [
    {
      type: "surface",
      x: xGrid,
      y: yGrid,
      z: zGrid,
      surfacecolor: data.grid,
      colorscale: "jet",
      cmin: vmin,
      cmax: vmax,
      colorbar: { title: "CO Concentration" },
    },
  ];

  const layout = {
    title: `Annual Average CO - ${year}`,
    scene: {
      bgcolor: "black",
      xaxis: { visible: false },
      yaxis: { visible: false },
      zaxis: { visible: false },
    },
  };

  Plotly.react(globeDiv, plotData, layout);
}
