exports.id = "main";
exports.modules = {

/***/ "1YLK":
/*!*****************!*\
  !*** ./demo.ts ***!
  \*****************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = __webpack_require__(/*! @nger/core */ "sI0h");
let Demo = class Demo {
    log() {
        console.log(`hello demo`);
        console.log(`hello xiao ming`);
    }
};
Demo = __decorate([
    core_1.Injectable()
], Demo);
exports.Demo = Demo;


/***/ })

};
//# sourceMappingURL=main.170d7f508c764ab0a166.hot-update.js.map