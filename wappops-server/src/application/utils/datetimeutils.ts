/**
 * Utilidades para fechas y horas.
 */

/**
 * Devuelve fecha y hora en formato ANSI 8601 con la hora local.
 * @param { Date | undefined } date 
 * @returns { string } Fecha formateada. Si la fecha no está definida,
 *                     se devuelve u testo vacío (= '').
 */
export function toLocalISOString(date: Date | string | undefined, includeMillis: boolean = false): string {
    if (!date) return '';

    const dateObj = (typeof date === 'string') ? new Date(date) : date;

    const datePart = dateObj.toISOString().substring(0, 10);
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const seconds = dateObj.getSeconds().toString().padStart(2, '0');
    let millis = '';
    if (includeMillis) {
        millis = dateObj.getMilliseconds().toString().padStart(3, '0');
    }

    const res = `${datePart}T${hours}:${minutes}:${seconds}${millis === '' ? '' : '.' + millis}`;

    return res;
}

/**
 * Devuelve la fecha en formato ANSI (solo año, mes y día)
 * @param { Date } date - Fecha a transformar-
 * @returns { string } - Fecha transformada.
 */
export function toLocaleDateString(date: Date | string | undefined): string {
    if (!date) return '';

    const dateObj = (typeof date === 'string') ? new Date(date) : date;

    return dateObj.toISOString().substring(0, 10);
}


/**
 * Formatea una fecha y hora en español con texto para hoy y mañana.
 * @param { Date } date - Fecha a formatear.
 * @param { 'include' | 'replace' } relativeText - Indica si se debe incluir
 *                                                  el texto relativo (hoy, mañana)
 *                                                  o reemplazarlo.
 * @returns {  string } - Fecha formateada.
 */
export function formatDateTime(date: Date | string | undefined, relativeText: 'include' | 'replace' = 'include'): string {
    if (!date) return '';

    const dateObj = (typeof date === 'string') ? new Date(date) : date;
    let dateString = dateObj.toLocaleDateString('es-ES', { hour: '2-digit', minute: '2-digit' });
    let relativePart = '';

    if (isToday(dateObj)) {
        relativePart = ' (Hoy)';
    }

    if (isTomorrow(dateObj)) {
        relativePart = ' (Mañana)';
    }

    if (relativeText === 'replace' && relativePart.length > 0) {
        return relativePart;
    }

    return dateString + relativePart;
}

/**
 * Determina si una fecha es hoy.
 * @param { Date } date - Fecha a comparar.
 * @returns { boolean} - Devuelve true si la fecha es hoy, false en caso contrario.
 */
export function isToday(date: Date): boolean {
    if (!date) return false;

    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

/**
 * Determina si una fecha es mañana.
 * @param { Date } date - Fecha a comparar.
 * @returns { boolean} - Devuelve true si la fecha es mañana, false en caso contrario.
 */
export function isTomorrow(date: Date): boolean {
    if (!date) return false;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
        date.getMonth() === tomorrow.getMonth() &&
        date.getFullYear() === tomorrow.getFullYear();
}

