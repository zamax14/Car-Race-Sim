# Arrankones

Simulador web local de carreras de autos. Configura la parrilla, observa el avance sobre una recta clara y conserva los resultados de la temporada en el navegador.

![Licencia: sin dependencias](https://img.shields.io/badge/dependencias-ninguna-159d65)

## Ejecutar

No requiere instalación ni backend. Puedes abrir `index.html` directamente en un navegador moderno o servir la carpeta con Python:

```bash
python3 -m http.server 8000
```

Después, visita [http://localhost:8000](http://localhost:8000).

## Uso

1. Ajusta los nombres, diseños de carrocería y colores de entre 2 y 8 participantes.
2. Define la distancia por vuelta y selecciona entre 1 y 10 vueltas.
3. Configura el ritmo visual y las probabilidades de averías e incidentes por carrera.
4. Pulsa **Iniciar carrera** para ver el semáforo de salida. Durante la prueba puedes pausarla o reiniciar la pista.
5. Las averías, salidas de pista y choques producen abandonos animados. El podio incluye únicamente a los autos que cruzaron la meta.

El historial conserva hasta 20 carreras y sus estadísticas en `localStorage`, por lo que los datos permanecen al recargar la página en el mismo navegador. Usa **Borrar historial** para eliminarlos.

## Estructura

- `index.html`: interfaz y estructura accesible de la aplicación.
- `styles.css`: diseño responsive con estética de marcador profesional.
- `app.js`: simulación por vueltas, recta animada, incidentes, clasificación e historial local.
