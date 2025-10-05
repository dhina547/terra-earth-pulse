const yearSlider = document.getElementById("year-slider");
const yearLabel = document.getElementById("year-label");
const generateButton = document.getElementById("generate-button");
const statusDiv = document.getElementById("status");
const loaderOverlay = document.getElementById("loader-overlay");
const loaderText = document.getElementById("loader-text");
const chartCtx = document.getElementById("timeSeriesChart").getContext("2d");
const globeDiv = document.getElementById("globe");
const themeToggle = document.getElementById("theme-toggle");

let timeSeriesChart;

// --- THEME TOGGLE LOGIC ---
themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark-mode");
});

// Update the label when the slider moves
yearSlider.addEventListener("input", (event) => {
  yearLabel.textContent = event.target.value;
});

// Main function to generate both visualizations
generateButton.addEventListener("click", async () => {
  const year = yearSlider.value;
  generateButton.disabled = true;
  statusDiv.textContent = "";
  loaderOverlay.style.display = "flex"; // Show full-screen loader

  if (timeSeriesChart) timeSeriesChart.destroy();
  Plotly.purge(globeDiv);

  try {
    loaderText.textContent = `Fetching time-series data for ${year}...`;

    // --- IMPORTANT: Use your live Render backend URL here ---
    const timeSeriesApiUrl = `https://terra-pulse-backend.onrender.com/api/timeseries?year=${year}`;

    const timeSeriesResponse = await fetch(timeSeriesApiUrl);
    if (!timeSeriesResponse.ok)
      throw new Error("Failed to fetch time-series data");
    const timeSeriesData = await timeSeriesResponse.json();
    createTimeSeriesGraph(timeSeriesData, year);

    loaderText.textContent = `Fetching map data for ${year}...`;

    // --- IMPORTANT: Use your live Render backend URL here ---
    const mapApiUrl = `https://terra-pulse-backend.onrender.com/api/annual_map?year=${year}`;

    const mapResponse = await fetch(mapApiUrl);
    if (!mapResponse.ok) throw new Error("Failed to fetch map data");
    const mapData = await mapResponse.json();
    create3DGlobe(mapData, year);

    statusDiv.textContent = `Visualizations for ${year} complete!`;
  } catch (error) {
    console.error("Error:", error);
    statusDiv.textContent = `Failed to generate visualizations for ${year}. Check console.`;
  } finally {
    generateButton.disabled = false;
    loaderOverlay.style.display = "none"; // Hide loader
  }
});

// The functions to create the graphs remain the same as the last version
function createTimeSeriesGraph(data, year) {
  const dataMin = Math.min(...data.averages);
  const dataMax = Math.max(...data.averages);
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
        title: { display: true, text: `CO Concentration Trend - ${year}` },
      },
      scales: {
        y: {
          min: axisMin,
          max: axisMax,
          ticks: { callback: (value) => value.toExponential(2) },
        },
      },
    },
  });
}

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
      colorbar: { title: "CO" },
    },
  ];

  const layout = {
    title: `Annual Average CO - ${year}`,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    scene: {
      bgcolor: "rgba(0,0,0,0)",
      xaxis: { visible: false },
      yaxis: { visible: false },
      zaxis: { visible: false },
    },
  };

  Plotly.react(globeDiv, plotData, layout);
}
