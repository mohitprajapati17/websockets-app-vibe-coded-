"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setActiveSession = exports.activeSession = void 0;
exports.activeSession = null;
const setActiveSession = (session) => {
    exports.activeSession = session;
};
exports.setActiveSession = setActiveSession;
