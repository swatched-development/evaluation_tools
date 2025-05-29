
async function reaload_main_code(){
    await pyodide.runPythonAsync(`
      from pyodide.http import pyfetch
      import sys 
      if "main_script" in sys.modules:
        del sys.modules["main_script"]
      response = await pyfetch("main.py?x=${Math.random()}")
      with open("main_script.py", "wb") as f:
          f.write(await response.bytes())
    `)
    pkg = pyodide.pyimport("main_script");
    pkg.test_caller("itwerks")
}

document.getElementById('reload_code').onclick = reaload_main_code;

loadPyodide({ indexURL: "/pkgs/" }).then(async(pyodide)=>{
  await pyodide.loadPackage("micropip")
  window.pyodide = pyodide;
  window.start = new Date();
  await pyodide.runPythonAsync(`
      import micropip
      await micropip.install(['numpy','scikit-learn','matplotlib','opencv-python'])
      from pyodide.http import pyfetch
    `)
  document.getElementById('reload_code').onclick = reaload_main_code;


})
