const otherAnswers = document.getElementById("other-answers")
async function handleSearch() {
  const term = document.getElementById('searchInput').value;
  showLoading(true)
  otherAnswers.innerHTML=""
  const res = await fetch('https://8ix3xnvt0j.execute-api.us-east-1.amazonaws.com/prod/beauty-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_term: term })
  });

  try{
    const data = await res.json();
    displayResults(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    otherAnswers.innerHTML=data.products;
  } finally {
    showLoading(false);
  }
}
function displayResults(data) {
  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = '';

  if (typeof data.products === 'string') {
    alert(data.products);
    return;
  }

  if (data.transaction_id) {
    const transaction = document.createElement('p');
    transaction.textContent = `Transaction ID: ${data.transaction_id}`;
    transaction.style.fontWeight = 'bold';
    transaction.style.marginBottom = '10px';
    resultsContainer.appendChild(transaction);
  }

  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      const tableTitle = document.createElement('h3');
      tableTitle.textContent = key;
      tableTitle.style.marginTop = '20px';
      resultsContainer.appendChild(tableTitle);

      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const headers = Object.keys(value[0]);
      const tr = document.createElement('tr');

      headers.forEach((header) => {
        const th = document.createElement('th');
        th.textContent = header;
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      value.forEach((row) => {
        const tr = document.createElement('tr');
        headers.forEach((header) => {
          const td = document.createElement('td');
          td.textContent = Array.isArray(row[header]) ? JSON.stringify(row[header]) : row[header];
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      resultsContainer.appendChild(table);
    }
  });
}
function showLoading(isLoading) {
  let overlay = document.getElementById('loadingOverlay');
  
  if (!overlay) {
    // Primero, agregar el estilo de animación al documento
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    // Crear el overlay
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999'
    });
    
    // Crear el spinner
    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '60px',
      height: '60px',
      border: '6px solid #f3f3f3',
      borderTop: '6px solid #333',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    });
    
    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
  }
  
  overlay.style.display = isLoading ? 'flex' : 'none';
}

