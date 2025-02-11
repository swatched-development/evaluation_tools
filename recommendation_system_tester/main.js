function addFilter() {
  const container = document.createElement('div');
  container.className = 'filter-container';

  container.innerHTML = `
                <select name="productType" required>
                    <option value="BLUSH">BLUSH</option>
                    <option value="CONCEALER">CONCEALER</option>
                    <option value="LIPSTICK">LIPSTICK</option>
                    <option value="BRONZER">BRONZER</option>
                    <option value="LIPGLOSS">LIPGLOSS</option>
                    <option value="LIP LINER">LIP LINER</option>
                    <option value="FOUNDATION">FOUNDATION</option>
                </select>
                <input type="text" placeholder="Attribute Name" name="attributeName" required>
                <select name="operator" required>
                    <option value="eq">Equal</option>
                    <option value="le">Less or Equal</option>
                    <option value="ge">Greater or Equal</option>
                </select>
                <input type="text" placeholder="Value" name="value" required>
                <button type="button" onclick="this.parentElement.remove()">Remove</button>
            `;

  document.getElementById('filtersContainer').appendChild(container);
}

function labToRGB(L, a, b) {
   // Reference values for D65 illuminant
    const Xn = 95.047;
    const Yn = 100.000;
    const Zn = 108.883;

    // Convert L* to Y
    const fy = (L + 16) / 116;
    const fx = fy + (a / 500);
    const fz = fy - (b / 200);

    // Convert to XYZ
    const delta = 6 / 29;
    const deltaSquared = Math.pow(delta, 2);
    const deltaCubed = Math.pow(delta, 3);
    
    const fx3 = Math.pow(fx, 3);
    const fy3 = Math.pow(fy, 3);
    const fz3 = Math.pow(fz, 3);

    let X = fx3 > deltaCubed ? fx3 : (fx - 16/116) * 3 * deltaSquared;
    let Y = fy3 > deltaCubed ? fy3 : (fy - 16/116) * 3 * deltaSquared;
    let Z = fz3 > deltaCubed ? fz3 : (fz - 16/116) * 3 * deltaSquared;

    // Scale by reference white
    X *= Xn;
    Y *= Yn;
    Z *= Zn;

    // XYZ to RGB conversion matrix
    let R = X * 0.032406 - Y * 0.015372 - Z * 0.004986;
    let G = -X * 0.009689 + Y * 0.018758 + Z * 0.000415;
    let B = X * 0.000557 - Y * 0.002040 + Z * 0.010570;

    // Gamma correction
    const gamma = (c) => {
        return c > 0.0031308 
            ? 1.055 * Math.pow(c, 1/2.4) - 0.055 
            : 12.92 * c;
    };

    R = gamma(R);
    G = gamma(G);
    B = gamma(B);

    // Convert to 0-255 range and clamp values
    const clamp = (x) => Math.min(255, Math.max(0, Math.round(x * 255)));
   return `rgb(${clamp(R)},${clamp(G)},${clamp(B)})`
}

async function getRecommendations() {
  // Build the payload according to the OpenAPI spec
  const productTypesChecked = Array.from(document.querySelectorAll('input[name="productTypes"]:checked'))
    .map(checkbox => checkbox.value);

  const filterContainers = document.querySelectorAll('.filter-container');
  const filters = Array.from(filterContainers).map(container => ({
    productType: container.querySelector('[name="productType"]').value,
    attributeName: container.querySelector('[name="attributeName"]').value,
    operator: container.querySelector('[name="operator"]').value,
    value: container.querySelector('[name="value"]').value
  }));

  const payload = {
    productTypes: productTypesChecked.length > 0 ? productTypesChecked : null,
    hairColor: document.getElementById('hairColor').value || null,
    skinTone: document.getElementById('skinTone').value,
    undertone: document.getElementById('undertone').value,
    filters: filters.length > 0 ? filters : null
  };

  // Display the payload
  document.getElementById('payload').innerHTML = 'Request Payload:\n' + 
    JSON.stringify(payload, null, 2);

  // Mock response data
  const mockResponse = {
    "BRONZER": [
      {
        "BRAND": "RARE BEAUTY",
        "PRODUCT TYPE": "BRONZER",
        "FORMULA": "CREAM",
        "PRODUCT NAME": "WARM WISHES EFFORTLESS BRONZER STICK",
        "COLOR NAME": "POWER BOOST",
        "PRODUCT COVERAGE": "LIGHT",
        "PRODUCT FINISH": "SATIN",
        "COLOR FAMILY": "TAN NEUTRAL",
        "PRICE": "28.0",
        "CIELAB": "57.20,17.04,23.95"
      }
    ],
    "LIPSTICK": [
      {
        "BRAND": "MAC",
        "PRODUCT TYPE": "LIPSTICK",
        "FORMULA": "CREAM",
        "PRODUCT NAME": "MATTE LIPSTICK",
        "COLOR NAME": "RUBY WOO",
        "PRODUCT FINISH": "MATTE",
        "COLOR FAMILY": "RED",
        "PRICE": "22.0",
        "CIELAB": "45.20,68.04,43.95"
      }
    ]
  };

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
 
  const {data} = await axios.post(
    'https://8ix3xnvt0j.execute-api.us-east-1.amazonaws.com/prod/products',
     payload)
  for (const [productType, products] of Object.entries(data)) {
    const h2 = document.createElement('h2');
    h2.textContent = productType;
    resultsDiv.appendChild(h2);

    const table = document.createElement('table');
    const headers = Object.keys(products[0]);

    const headerRow = document.createElement('tr');
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    const cielabRepHeader = headerRow.appendChild(document.createElement('th'));
    cielabRepHeader.textContent="CielabToRGB"
    table.appendChild(headerRow);

    products.forEach(product => {
      const row = document.createElement('tr');
      headers.forEach(header => {
        const td = document.createElement('td');
        td.textContent = product[header] || '';
        row.appendChild(td);
      });

      const swatchTd = document.createElement('td');
      if (product['CIELAB']) {
        const [L, a, b] = product['CIELAB'].split(',').map(Number);
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = labToRGB(L, a, b);
        swatchTd.appendChild(swatch);
      }
      row.appendChild(swatchTd);

      table.appendChild(row);
    });

    resultsDiv.appendChild(table);
  }
}

