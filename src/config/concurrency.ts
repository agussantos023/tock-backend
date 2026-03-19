import pLimit from "p-limit";

// Configuramos el máximo de 3 tareas simultáneas
// Esto deja 1 núcleo libre para el Event Loop y la BD
export const audioLimit = pLimit(2);
