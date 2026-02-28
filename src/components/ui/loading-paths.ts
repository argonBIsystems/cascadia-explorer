/**
 * SVG path data for the loading screen tectonic illustration.
 *
 * Projection (equirectangular):
 *   x = (lon + 132) * (800 / 14)
 *   y = (52 - lat)  * (600 / 12)
 *
 * Maps the region -132 W to -118 W, 40 N to 52 N into an 800x600 viewBox.
 */

/** Simplified Cascadia megathrust fault trace (~30 points).
 *  Cape Mendocino (40.3 N, 124.4 W) to northern Vancouver Island (50.5 N, 128.5 W). */
export const cascadiaFaultTrace =
  'M 434.3 585 L 428.6 575 L 422.9 560 L 422.9 540 L 428.6 525 L 434.3 505' +
  ' L 428.6 485 L 422.9 465 L 417.1 445 L 411.4 425 L 405.7 405 L 400 385' +
  ' L 394.3 370 L 388.6 350 L 382.9 335 L 377.1 315 L 371.4 300 L 365.7 285' +
  ' L 371.4 265 L 377.1 250 L 382.9 235 L 388.6 220 L 371.4 205 L 354.3 190' +
  ' L 331.4 175 L 314.3 160 L 285.7 140 L 257.1 120 L 228.6 100 L 200 75';

/** Outline of the Juan de Fuca plate (closed path).
 *  East edge = subduction zone, west edge = Juan de Fuca Ridge,
 *  south = Mendocino FZ, north = Nootka Fault / Explorer Ridge. */
export const juanDeFucaPlate =
  'M 434.3 585 L 257.1 585 L 228.6 575 L 200 550 L 217.1 500 L 228.6 450' +
  ' L 200 400 L 171.4 350 L 142.9 300 L 125.7 250 L 142.9 225 L 171.4 200' +
  ' L 200 175 L 228.6 150 L 200 125 L 171.4 100 L 200 75 L 228.6 100' +
  ' L 257.1 120 L 285.7 140 L 314.3 160 L 331.4 175 L 354.3 190 L 371.4 205' +
  ' L 388.6 220 L 382.9 235 L 377.1 250 L 371.4 265 L 365.7 285 L 371.4 300' +
  ' L 377.1 315 L 382.9 335 L 388.6 350 L 394.3 370 L 400 385 L 405.7 405' +
  ' L 411.4 425 L 417.1 445 L 422.9 465 L 428.6 485 L 434.3 505 L 428.6 525' +
  ' L 422.9 540 L 422.9 560 L 428.6 575 L 434.3 585 Z';

/** Eastern edge of the Pacific plate (Juan de Fuca Ridge + Mendocino FZ). */
export const pacificPlateEdge =
  'M 114.3 75 L 171.4 100 L 200 125 L 228.6 150 L 200 175 L 171.4 200' +
  ' L 142.9 225 L 125.7 250 L 142.9 300 L 171.4 350 L 200 400 L 228.6 450' +
  ' L 217.1 500 L 200 550 L 228.6 575 L 257.1 585 L 228.6 590 L 171.4 595' +
  ' L 114.3 600';

/** Western edge of the North American plate (inland side of the subduction zone). */
export const northAmericanPlateEdge =
  'M 434.3 585 L 485.7 585 L 542.9 550 L 571.4 500 L 600 450 L 628.6 400' +
  ' L 628.6 350 L 657.1 300 L 657.1 250 L 685.7 200 L 685.7 150 L 657.1 100' +
  ' L 628.6 75 L 600 50 L 571.4 25';
