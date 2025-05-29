#!/bin/bash

# Ruta base de los paquetes Pyodide
BASE_URL="https://cdn.jsdelivr.net/pyodide/v0.27.6/full"

# Ruta al archivo JSON de bloqueo
LOCK_FILE="pyodide-lock.json"

# Extraer y descargar todos los archivos .whl
jq -r '.packages[] | select(.file_name | endswith(".whl")) | .file_name' "$LOCK_FILE" | while read -r file; do
  echo "Descargando: $file"
  curl -O "$BASE_URL/$file"
done
