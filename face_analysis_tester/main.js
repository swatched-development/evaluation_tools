const params = new URLSearchParams(window.location.search);
const public_api_key = params.get("key")
//'https://8ix3xnvt0j.execute-api.us-east-1.amazonaws.com/prod/aiface', {
   document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const loading = document.getElementById('loading');
            loading.style.display = 'block';

            // Preview the image
            const preview = document.getElementById('preview');
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
            };
            reader.readAsDataURL(file);

            // Send the image for analysis
            const binaryReader = new FileReader();
            binaryReader.onload = async function(e) {
                try {
                    // Replace with your actual endpoint
                    const response = await fetch('https://8ix3xnvt0j.execute-api.us-east-1.amazonaws.com/prod/aiface', {
                        method: 'POST',
                        headers: {
                            'Content-Type': file.type,
                             'x-api-key' :  public_api_key
                        },
                        body: e.target.result
                    });

                    // For demo purposes, using sample data
                    const data = {
                        "top_colors": {
                            "bottom_lip": [[174, 125, 121], [183, 134, 130], [178, 141, 135], [159, 106, 102], [158, 142, 143]],
                            "upper_lip": [[169, 124, 119], [169, 124, 118], [174, 131, 125], [171, 123, 119], [170, 122, 120]],
                            "nose_brick": [[205, 165, 153], [206, 166, 154], [230, 191, 184], [226, 181, 175], [205, 165, 155]],
                            "front": [[221, 182, 167], [221, 181, 169], [222, 186, 174], [222, 183, 168], [215, 172, 155]],
                            "right_cheek": [[206, 166, 154], [205, 165, 155], [205, 165, 153], [208, 168, 160], [206, 166, 156]],
                            "left_cheek": [[226, 195, 190], [227, 196, 193], [225, 194, 189], [225, 194, 191], [226, 197, 193]],
                            "left_iris": [[120, 75, 80], [145, 108, 99], [139, 104, 98], [133, 94, 87], [122, 87, 83]],
                            "right_iris": [[117, 102, 125], [105, 86, 105], [106, 89, 108], [118, 101, 120], [100, 81, 101]]
                        },
                        "pitch_angle": 0.2697770715265862,
                        "yaw_angle": 104.03624346792648
                    };
                    const finalResult = await response.json()
                    if (finalResult.top_colors)
                      displayResults(finalResult)
                    else 
                      alert(finalResult)
                } catch (error) {
                    //console.error('Error:', error);
                    alert(error);
                } finally {
                    loading.style.display = 'none';
                }
            };

            binaryReader.readAsArrayBuffer(file);
        });

        function displayResults(data) {
            const resultsContainer = document.getElementById('results');
            const anglesContainer = document.getElementById('angles');
            resultsContainer.innerHTML = '';
            
            Object.entries(data.top_colors).forEach(([feature, colors]) => {
                const featureGroup = document.createElement('div');
                featureGroup.className = 'feature-group';
                
                const title = document.createElement('div');
                title.className = 'feature-title';
                title.textContent = feature.replace(/_/g, ' ');
                
                const swatchesContainer = document.createElement('div');
                swatchesContainer.className = 'color-swatches';
                
                colors.forEach(color => {
                    const swatch = document.createElement('div');
                    swatch.className = 'color-swatch';
                    swatch.style.backgroundColor = `rgb(${color.join(',')})`;
                    swatch.title = `RGB(${color.join(',')})`;
                    swatchesContainer.appendChild(swatch);
                });
                
                featureGroup.appendChild(title);
                featureGroup.appendChild(swatchesContainer);
                resultsContainer.appendChild(featureGroup);
            });

            anglesContainer.innerHTML = `
                <h2>Face Angles</h2>
                <p>Pitch: ${Math.round(data.pitch_angle)}°</p>
                <p>Yaw: ${Math.round(data.yaw_angle)}°</p>
            `;
        }
