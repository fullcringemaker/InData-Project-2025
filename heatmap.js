class RTTHeatmap {
  constructor(containerId, rttLevels) {
    this.container = document.getElementById(containerId);
    this.rttLevels = rttLevels;
    this.url = "/api/check_resource/heatmap/";
  }
  setUrl(url) {
    this.url = url;
  }
  setRTTLevels(rttLevels) {
    this.rttLevels = rttLevels;
  }
  async buildHeatmap(resourceType = "http") {
    this.container.innerHTML = "";
    let data;
    try {
      const response = await fetch(this.url + '?' + new URLSearchParams({resource_type: resourceType}));
      data = await response.json();
    } catch (error) {
      this.container.innerText = "Ошибка загрузки данных.";
      return;
    }
    const grouped = this.groupByResource(data);
    for (const [resource, records] of Object.entries(grouped)) {
      this.container.appendChild(this.renderTable(resource, records));
    }
    this.renderLegend();
  }
  groupByResource(data) {
    const result = {};
    for (const item of data) {
      if (!result[item.resource]) result[item.resource] = [];
      result[item.resource].push(item);
    }
    return result;
  }
  getColor(rtt) {
    if (rtt === null) {
      const nullLevel = this.rttLevels.find(level => level.interval === null);
      return nullLevel ? nullLevel.color : 'gray';
    }
    for (const level of this.rttLevels) {
      if (level.interval !== null) {
        const [min, max] = level.interval;
        if ((min === null || rtt >= min) && (max === null || rtt < max)) {
          return level.color;
        }
      }
    }
    return 'white';
  }
  renderTable(resource, records) {
    const table = document.createElement('table');
    const cities = [...new Set(records.map(r => r.city))];
    const providers = [...new Set(records.map(r => r.provider))];
    const header = document.createElement('tr');
    header.appendChild(document.createElement('th'));
    for (const provider of providers) {
      const th = document.createElement('th');
      th.textContent = provider;
      header.appendChild(th);
    }
    table.appendChild(header);
    for (const city of cities) {
      const row = document.createElement('tr');
      const cityCell = document.createElement('th');
      cityCell.textContent = city;
      row.appendChild(cityCell);
      for (const provider of providers) {
        const cell = document.createElement('td');
        const entry = records.find(r => r.city === city && r.provider === provider);
        if (entry) {
          const color = this.getColor(entry.rtt);
          cell.style.backgroundColor = color;
          cell.textContent = entry.rtt !== null ? entry.rtt.toFixed(1) + ' ms' : 'N/A';
        } else {
          cell.textContent = '-';
          cell.style.backgroundColor = '#eee';
        }
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    const caption = document.createElement('caption');
    caption.textContent = `Ресурс: ${resource}`;
    table.prepend(caption);
    return table;
  }
  renderLegend() {
    const legendContainer = document.getElementById("legend");
    legendContainer.innerHTML = "";
    for (const level of this.rttLevels) {
      const item = document.createElement("div");
      item.className = "legend-item";
      const colorBox = document.createElement("div");
      colorBox.className = "legend-color";
      colorBox.style.backgroundColor = level.color;
      const label = document.createElement("span");
      if (level.interval === null) {
        label.textContent = "N/A";
      } else {
        const [min, max] = level.interval;
          if (min !== null && max !== null) {
            label.textContent = `${min}–${max} ms`;
          } else if (min !== null && max === null) {
            label.textContent = `>${min} ms`;
          } else if (min === null && max !== null) {
            label.textContent = `<${max} ms`;
          } else {
            label.textContent = "N/A";
          }
      }
      item.appendChild(colorBox);
      item.appendChild(label);
      legendContainer.appendChild(item);
    }
  }
}
window.onload = function() {
  const defaultType = "http";
  const rttLevels = {
    "http": [
        { interval: [0, 100], color: 'lightgreen' },
        { interval: [100, 500], color: 'khaki' },
        { interval: [500, 1000], color: 'orange' },
        { interval: [1000, null], color: 'red' },
        { interval: null, color: 'gray' },
    ],
    "kdig": [
        { interval: [0, 50], color: 'lightgreen' },
        { interval: [50, 100], color: 'khaki' },
        { interval: [100, 500], color: 'orange' },
        { interval: [500, null], color: 'red' },
        { interval: null, color: 'gray' },
    ],
  };
  const rttHeatmap = new RTTHeatmap("heatmap", rttLevels[defaultType]);
  const selector = document.getElementById("resourceType");
  selector.addEventListener("change", () => {
    const type = selector.value;
    rttHeatmap.setRTTLevels(rttLevels[type]);
    rttHeatmap.buildHeatmap(type);
  });
  rttHeatmap.buildHeatmap(defaultType);
};
