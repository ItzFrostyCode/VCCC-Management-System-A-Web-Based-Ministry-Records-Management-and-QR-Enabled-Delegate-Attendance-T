/**
 * LEGACY BRIDGE SCRIPT
 * This file exists to prevent 404 errors on older cached versions of church.html
 * It redirects the browser logic to the new churches.controller.js entry point.
 */
import './churches/churches.controller.js';

console.log("Legacy Bridge: Charging churches.controller.js from /js/pages/church.js");
