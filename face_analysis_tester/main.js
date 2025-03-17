const params = new URLSearchParams(window.location.search);
const public_api_key = params.get("key")

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  //const submitBtn = document.getElementById('submitBtn');
  const imagePreview = document.getElementById('imagePreview');
  const uploadPrompt = document.getElementById('uploadPrompt');
  const resultsContent = document.getElementById('resultsContent');
  const loadingIndicator = document.getElementById('loadingIndicator');

  // Configuration
  const MAX_FILE_SIZE_MB = 10; // Maximum file size in MB
  const MAX_DIMENSION = 2048; // Maximum dimension for resizing
  
  // Image data to be sent
  let imageData = null;

  // Set up event listeners
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);
  //submitBtn.addEventListener('click', submitImage);

  // Handle file selection
  function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Check if the file is an image
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }
    
    // Read the selected file
    const reader = new FileReader();
    
    reader.onload = function(e) {
      // Create an image element to get dimensions
      const img = new Image();
      
      img.onload = function() {
        // Display preview image
        imagePreview.src = e.target.result;
        imagePreview.classList.remove('hidden');
        uploadPrompt.classList.add('hidden');
        
        // Enable submit button
        //submitBtn.disabled = false;
        
        // Resize image if needed
        resizeImageIfNeeded(img);
      };
      
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  }

  // Resize image if it's too large
  function resizeImageIfNeeded(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate new dimensions while maintaining aspect ratio
    let width = img.width;
    let height = img.height;
    
    /*if (width > height) {
      if (width > MAX_DIMENSION) {
        height = Math.round(height * (MAX_DIMENSION / width));
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width = Math.round(width * (MAX_DIMENSION / height));
        height = MAX_DIMENSION;
      }
    }*/
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Draw resized image on canvas
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convert to blob with reduced quality until size is below threshold
    reduceImageQuality(canvas);
  }

  // Reduce image quality until size is below threshold
  function reduceImageQuality(canvas, quality = 0.9) {
    canvas.toBlob(function(blob) {
      const sizeMB = blob.size / (1024 * 1024);
      
      if (false){//sizeMB > MAX_FILE_SIZE_MB && quality > 0.3) {
        // Reduce quality and try again
        reduceImageQuality(canvas, quality - 0.1);
      } else {
        // Convert blob to base64 for sending
        const reader = new FileReader();
        reader.readAsArrayBuffer(blob)
        reader.onload = function(e) {
          imageData = e.target.result;
          submitImage()
        };
      }
    }, 'image/jpeg', quality);
  }

  // Submit image to server
  async function submitImage() {
    if (!imageData) {
      alert('Please select an image first');
      return;
    }
    
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    resultsContent.innerHTML = '';
    
    // Actual fetch would look like this:
    const response = await fetch('https://8ix3xnvt0j.execute-api.us-east-1.amazonaws.com/prod/aiface', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpg',
        'x-api-key' :  public_api_key
      },
      body: imageData
    })
    try {
      if (response.status !==200)
        throw await response.text()
      const data = await response.json();
      displayResults(data)
    }catch(e){
      if (/NO_FACES/.test(e))
        alert("The face in the photo is not properly captured, faces to far or to small are being ignored.")
      else
        alert(e)
    }
    loadingIndicator.classList.add('hidden');

    /*.then(response => response.json())
    .then(data => {
      loadingIndicator.classList.add('hidden');
      displayResults(data);
    })
    .catch(error => {
      loadingIndicator.classList.add('hidden');
      resultsContent.innerHTML = `<p>Error: ${error.message}</p>`;
    });*/
    
  }

  // Display color analysis results
  function displayResults(data) {
    let html = '';

    html +=`
       <div class="color-section">
          <span> Skintone:${JSON.stringify(data.vit_skintone)} </span><br>
          <span> Skintone:${JSON.stringify(data.vit_faceshape)} </span><br>
          <span> ${JSON.stringify(data.undertone_histogram)} </span>
        <div></div>
    `

    for (let product_type in data.reference_products){
       html += `
        <div class="color-section">
          <h3>${formatRegionName("SIMILAR "+product_type)}</h3>
          <div class="color-swatches">
      `;
       const products = data.reference_products[product_type];
       let i =0 
       for (let name in products){
          const [r,g,b] =products[name]
          const rgbString = `rgb(${r}, ${g}, ${b})`;
          i++
          html += `
              <div class="color-swatch" style="background-color: ${rgbString}">
                <span>${name} ${i%2 ?"<br><br><br>":""} </span>
              </div>
            `;

       }
        html += `
          </div>
        </div>
      `;

      
    }
    
    for (const [region, colors] of Object.entries(data.top_colors)) {
      html += `
        <div class="color-section">
          <h3>${formatRegionName(region)}</h3>
          <div class="color-swatches">
      `;
      
      colors.forEach(color => {
        const [r, g, b] = color;
        const rgbString = `rgb(${r}, ${g}, ${b})`;
        const hexColor = rgbToHex(r, g, b);
        
        html += `
          <div class="color-swatch" style="background-color: ${rgbString}">
            <span>${hexColor}</span>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    }
    
    resultsContent.innerHTML = html;
  }

  // Helper function to format region names
  function formatRegionName(name) {
    return name.replace(/_/g, ' ');
  }

  // Convert RGB to hex
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
});
