class Util {
    constructor() { }

    static deepClone(obj) {
        if (!obj || true == obj) //this also handles boolean as true and false
            return obj;
        var objType = typeof (obj);
        if ("number" == objType || "string" == objType) // add your immutables here
            return obj;
        var result = Array.isArray(obj) ? [] : {};
        if (obj instanceof Map) {
            result = new Map();
            for (let i = 0; i < obj.keys().length; i++) {
                let key = obj.keys()[i];
                result.set(key, Util.deepClone(obj.get(key)));
            }
        }
        for (var key in obj)
            if (obj.hasOwnProperty(key))
                result[key] = Util.deepClone(obj[key]);
        return result;
    }

    static formatTime(time) {
        let currentTimeS = parseInt(time / 1000);
        let currentTimeMS = parseInt(time % 1000 / 10);
        let currentTimeSStr = currentTimeS < 10 ? '0' + currentTimeS : '' + currentTimeS;
        let currentTimeMSStr = currentTimeMS < 10 ? '0' + currentTimeMS : '' + currentTimeMS;
        return currentTimeSStr + ':' + currentTimeMSStr;
    }

    static color2RGB(color) {
        color = color.toLowerCase();
        if (Array.from(this.colorNames.keys()).includes(color)) {
            color = this.colorNames.get(color);
        }
        color = color.replace(/\s/g, '');
        if (color.indexOf('rgb') >= 0) {
            let tmpStr = color.substr(color.indexOf('(') + 1);
            tmpStr = tmpStr.substring(0, tmpStr.indexOf(')'));
            let rgb = tmpStr.split(',');
            if (rgb.length === 3) {
                rgb[3] = 255;
            }
            return [parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3])];
        } else if (color.indexOf('#') >= 0) {
            return this.HEX2RGB(color);
        }
        return [255, 255, 255, 0];
    }

    static HEX2RGB(hex) {
        if (hex.charAt(0) === '#') {
            hex = hex.substr(1);
        }
        if ((hex.length < 2) || (hex.length > 6)) {
            return false;
        }
        let values = hex.split(''),
            r,
            g,
            b,
            a = 255;

        if (hex.length === 2) {
            r = parseInt(values[0].toString() + values[1].toString(), 16);
            g = r;
            b = r;
        } else if (hex.length === 3) {
            r = parseInt(values[0].toString() + values[0].toString(), 16);
            g = parseInt(values[1].toString() + values[1].toString(), 16);
            b = parseInt(values[2].toString() + values[2].toString(), 16);
        } else if (hex.length === 6) {
            r = parseInt(values[0].toString() + values[1].toString(), 16);
            g = parseInt(values[2].toString() + values[3].toString(), 16);
            b = parseInt(values[4].toString() + values[5].toString(), 16);
        } else {
            return false;
        }
        return [r, g, b, a];
    }

    static toJSON(node) {
        node = node || this;
        let obj = {
            nodeType: node.nodeType
        };
        if (node.tagName) {
            obj.tagName = node.tagName.toLowerCase();
        } else
            if (node.nodeName) {
                obj.nodeName = node.nodeName;
            }
        if (node.nodeValue) {
            obj.nodeValue = node.nodeValue;
        }
        let attrs = node.attributes;
        if (attrs) {
            obj.attr = {};
            for (let i = 0, attr; i < attrs.length | (attr = attrs[i]); i++) {
                obj.attr[attr.nodeName] = attr.nodeValue;
            }
        }

        return obj;
    }

    static toDOM(obj) {
        if (typeof obj == 'string') {
            obj = JSON.parse(obj);
        }
        let node, nodeType = obj.nodeType;
        switch (nodeType) {
            case 1: //ELEMENT_NODE
                node = document.createElementNS('http://www.w3.org/2000/svg', obj.tagName);
                let attributes = obj.attr || {};
                for (let i = 0, attr; i < Object.keys(attributes).length | (attr = Object.keys(attributes)[i]); i++) {
                    let attrValue = typeof attributes[attr] === 'object' ? JSON.stringify(attributes[attr], null, 0) : attributes[attr];
                    node.setAttributeNS(null, attr, attrValue);
                }
                break;
            case 3: //TEXT_NODE
                node = document.createTextNode(obj.nodeValue);
                break;
            case 8: //COMMENT_NODE
                node = document.createComment(obj.nodeValue);
                break;
            case 9: //DOCUMENT_NODE
                node = document.implementation.createDocument();
                break;
            case 10: //DOCUMENT_TYPE_NODE
                node = document.implementation.createDocumentType(obj.nodeName);
                break;
            case 11: //DOCUMENT_FRAGMENT_NODE
                node = document.createDocumentFragment();
                break;
            default:
                return node;
        }

        return node;
    }

    /**
     * @param {*} obj A parsed svg json object.
     */
    static discretizePath(obj) {
        // normalize attributes
        if (obj.tagName !== 'path') return null
        let attr = obj.attr || {}
        if (!attr.d) return null
        return Util.discretizeD(attr.d, attr.fill);
    }

    static discretizeD(d, fillColor) {
        let resultGroup = [],
            reg = /[MmLlHhVvZzCcSsQqTtAa][^MmLlHhVvZzCcSsQqTtAa]*/gi,
            group = undefined;
        while ((group = reg.exec(d))) {
            let offset = resultGroup.reduce((p, c) => p + c.length, 0);
            resultGroup.push(d.slice(offset, group.index));
            resultGroup.push(group[0]);
        }
        let result = resultGroup
            .map(x => {
                let command = x.slice(0, 1);
                let parameters = x
                    .slice(1)
                    .split(/[ ,]/)
                    .filter(n => n.trim())
                    .map(n => parseFloat(n));
                return command ? {
                    command,
                    parameters
                } : null;
            }).filter(x => x)
        // polyline style path
        if (result.every(x => 'MmLlHhVv'.includes(x.command)) && !Util.convertColor(fillColor)) {
            let lines = []
            let prev = null
            let valid = true
            result.forEach(x => {
                if (!valid) return
                if (x.command === 'M') {
                    prev = x.parameters.slice(-2)
                    return
                }
                if (!prev) return valid = false
                if (x.command === 'm') {
                    prev = prev.map((v, i) => v + x.parameters[i])
                    return
                }
                let firstPoint = prev,
                    secondPoint = x.command === x.command.toLowerCase() ? prev.slice() : [0, 0]
                switch (x.command.toLowerCase()) {
                    case 'l':
                        secondPoint = secondPoint.map((v, i) => v + x.parameters[i])
                        break
                    case 'h':
                        secondPoint[0] += x.parameters[0]
                        secondPoint[1] = firstPoint[1]
                        break
                    case 'v':
                        secondPoint[1] += x.parameters[0]
                        secondPoint[0] = firstPoint[0]
                        break
                }
                if (secondPoint) {
                    lines.push([firstPoint, secondPoint])
                    prev = secondPoint
                } else {
                    valid = false
                }
            })
            if (valid) return {
                type: 'lines',
                data: lines
            }
        }
        // pie style path
        if (result.every(x => 'MmLlAaZz'.includes(x.command)) && result.filter(x => x.command.toLowerCase() === 'a').length) {
            let circles = []
            let prev = null
            let valid = true
            result.forEach(x => {
                if (!valid) return
                if (x.command.toLowerCase() === 'm') {
                    prev = x.parameters.slice(-2)
                    return
                }
                if (!prev) return valid = false
                if (x.command.toLowerCase() === 'z') return
                let firstPoint = prev,
                    secondPoint = x.command.toLowerCase() === x.command ? prev.slice() : [0, 0]
                if (x.command.toLowerCase() !== 'a') {
                    return prev = secondPoint.map((v, i) => v + x.parameters[i])
                }
                secondPoint = secondPoint.map((v, i) => v + x.parameters[i + 5])
                circles.push({
                    ...Util.svgArcToCenterParam.apply(null, firstPoint.concat(x.parameters.slice(0, 5)).concat(secondPoint)),
                    rx: x.parameters[0],
                    ry: x.parameters[1],
                    rotate: x.parameters[2]
                })
                prev = secondPoint
            })
            if (circles.length <= 0 || !circles.every(x => ['cx', 'cy'].reduce((p, c) => p + Math.abs(x[c] - circles[0][c]), 0) < 1e-1)) valid = false
            if (valid) {
                let c = circles.reduce((p, c) => {
                    if (!p) return c
                    if (c.rx + c.ry > p.rx + p.ry) return c
                    return p
                }, null)
                let attrResult = {
                    type: 'pies',
                    data: {
                        cx: c.cx,
                        cy: c.cy,
                        startAngle: c.startAngle,
                        endAngle: c.endAngle,
                        radius: circles.map(x => {
                            return {
                                rx: x.rx,
                                ry: x.ry,
                                rotate: x.rotate
                            }
                        })
                    }
                }
                return attrResult;
            }
        }
        // other unhandled style path
        return null
    }

    static radian(ux, uy, vx, vy) {
        var dot = ux * vx + uy * vy;
        var mod = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
        var rad = Math.acos(dot / mod);
        if (ux * vy - uy * vx < 0.0) {
            rad = -rad;
        }
        return rad;
    }

    static svgArcToCenterParam(x1, y1, rx, ry, phi, fA, fS, x2, y2) {
        var cx, cy, startAngle, deltaAngle, endAngle;
        var PIx2 = Math.PI * 2.0;

        if (rx < 0) {
            rx = -rx;
        }
        if (ry < 0) {
            ry = -ry;
        }
        if (rx == 0.0 || ry == 0.0) { // invalid arguments
            throw Error('rx and ry can not be 0');
        }

        var s_phi = Math.sin(phi);
        var c_phi = Math.cos(phi);
        var hd_x = (x1 - x2) / 2.0; // half diff of x
        var hd_y = (y1 - y2) / 2.0; // half diff of y
        var hs_x = (x1 + x2) / 2.0; // half sum of x
        var hs_y = (y1 + y2) / 2.0; // half sum of y

        // F6.5.1
        var x1_ = c_phi * hd_x + s_phi * hd_y;
        var y1_ = c_phi * hd_y - s_phi * hd_x;

        // F.6.6 Correction of out-of-range radii
        //   Step 3: Ensure radii are large enough
        var lambda = (x1_ * x1_) / (rx * rx) + (y1_ * y1_) / (ry * ry);
        if (lambda > 1) {
            rx = rx * Math.sqrt(lambda);
            ry = ry * Math.sqrt(lambda);
        }

        var rxry = rx * ry;
        var rxy1_ = rx * y1_;
        var ryx1_ = ry * x1_;
        var sum_of_sq = rxy1_ * rxy1_ + ryx1_ * ryx1_; // sum of square
        if (!sum_of_sq) {
            throw Error('start point can not be same as end point');
        }
        var coe = Math.sqrt(Math.abs((rxry * rxry - sum_of_sq) / sum_of_sq));
        if (fA == fS) {
            coe = -coe;
        }

        // F6.5.2
        var cx_ = coe * rxy1_ / ry;
        var cy_ = -coe * ryx1_ / rx;

        // F6.5.3
        cx = c_phi * cx_ - s_phi * cy_ + hs_x;
        cy = s_phi * cx_ + c_phi * cy_ + hs_y;

        var xcr1 = (x1_ - cx_) / rx;
        var xcr2 = (x1_ + cx_) / rx;
        var ycr1 = (y1_ - cy_) / ry;
        var ycr2 = (y1_ + cy_) / ry;

        // F6.5.5
        startAngle = Util.radian(1.0, 0.0, xcr1, ycr1);

        // F6.5.6
        deltaAngle = Util.radian(xcr1, ycr1, -xcr2, -ycr2);
        while (deltaAngle > PIx2) {
            deltaAngle -= PIx2;
        }
        while (deltaAngle < 0.0) {
            deltaAngle += PIx2;
        }
        if (fS == false || fS == 0) {
            deltaAngle -= PIx2;
        }
        endAngle = startAngle + deltaAngle;
        while (endAngle > PIx2) {
            endAngle -= PIx2;
        }
        while (endAngle < 0.0) {
            endAngle += PIx2;
        }

        var outputObj = {
            /* cx, cy, startAngle, deltaAngle */
            cx,
            cy,
            startAngle,
            deltaAngle,
            endAngle,
            clockwise: (fS == true || fS == 1)
        }

        return outputObj;
    }

    static convertColor(str, fMode, tMode) {
        if (typeof str !== 'string') return str
        if (str === 'none') return null
        str = str.trim()
        let mr = null
        if (tMode === undefined) {
            tMode = fMode
            if (str.startsWith('#')) {
                fMode = 'hex'
            } else if (str.startsWith('rgb')) {
                fMode = 'rgb'
            }
        }
        // assume user input is valid
        switch (fMode) {
            case 'rgb':
                mr = str.split('(')[1].split(',').map(x => parseFloat(x))
                break
            case 'hex':
                mr = str.slice(1).match(/.{1,2}/g).map(x => parseInt(x, 16))
            default:
                return str
        }
        mr = mr.slice(0, 3)
        switch (tMode) {
            case 'hex':
                return '#' + mr.map(x => x.toString(16).padStart(2, '0')).join('')
            case 'rgb':
                return `rgb(${mr.join(',')})`
            default:
                return str
        }
    }

    static polarToCartesian(centerX, centerY, radius, angleInRadians) {
        return {
            x: Math.round((centerX + (radius * Math.cos(angleInRadians))) * 100) / 100,
            y: Math.round((centerY + (radius * Math.sin(angleInRadians))) * 100) / 100
        };
    };

    static arc(x, y, innerRadius, outterRadius, startAngle, endAngle) {
        startAngle = startAngle < 0 ? startAngle + 2 * Math.PI : startAngle;
        endAngle = endAngle < 0 || startAngle > endAngle ? endAngle + 2 * Math.PI : endAngle;

        //to generate cover, make the cover a little bigger
        innerRadius = innerRadius === 0 ? 0 : innerRadius - 1;
        outterRadius += 1;

        let largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;

        let start1 = Util.polarToCartesian(x, y, outterRadius, endAngle);
        let end1 = Util.polarToCartesian(x, y, outterRadius, startAngle);
        let start2 = Util.polarToCartesian(x, y, innerRadius, endAngle);
        let end2 = Util.polarToCartesian(x, y, innerRadius, startAngle);

        let isRing = false;
        if (start1.x === end1.x && start1.y === end1.y) {//this is a ring
            end1.y -= 1;
            end2.y -= 1;
            isRing = true;
        }

        let d;
        if (!isRing) {
            d = [
                "M" + start1.x, start1.y,
                "A" + outterRadius, outterRadius, 0, largeArcFlag, 0, end1.x, end1.y,
                "L" + end2.x, end2.y,
                "A" + innerRadius, innerRadius, 0, largeArcFlag, 1, start2.x, start2.y,
                "L" + start1.x, start1.y + "Z"
            ].join(",");
        } else {
            d = [
                "M" + start1.x, start1.y,
                "A" + outterRadius, outterRadius, 0, largeArcFlag, 1, end1.x, end1.y,
                "M" + end2.x, end2.y,
                "A" + innerRadius, innerRadius, 0, largeArcFlag, 0, start2.x, start2.y + "Z"
            ].join(",");
        }

        return d;
    };

    /**
     * turn a dom node to string
     * @param {DOM} domNode 
     */
    static domNodeToString(domNode) {
        var element = document.createElement("div");
        element.appendChild(domNode);
        return element.innerHTML;
    }

    /**
     * turn a string to dom node
     * @param {string} str 
     */
    static strToDomNode(str) {
        let tmpDiv = document.createElement('div');
        tmpDiv.innerHTML = str.trim();
        let dom = tmpDiv.firstChild;
        return dom;
    }

    static transShape(t, tx, ty) {
        if (t.tagName !== 'path') {
            let hasPosi = false;
            if (t.getAttribute('x') || t.getAttribute('y')) {
                hasPosi = true;
                t.setAttribute('x', t.getAttribute('x') ? parseFloat(t.getAttribute('x')) + tx : tx);
                t.setAttribute('y', t.getAttribute('y') ? parseFloat(t.getAttribute('y')) + ty : ty);
            }
            if (t.getAttribute('x1') || t.getAttribute('y1') || t.getAttribute('x2') || t.getAttribute('y2')) {
                hasPosi = true;
                t.setAttribute('x1', t.getAttribute('x1') ? parseFloat(t.getAttribute('x1')) + tx : tx);
                t.setAttribute('x2', t.getAttribute('x2') ? parseFloat(t.getAttribute('x2')) + tx : tx);
                t.setAttribute('y1', t.getAttribute('y1') ? parseFloat(t.getAttribute('y1')) + ty : ty);
                t.setAttribute('y2', t.getAttribute('y2') ? parseFloat(t.getAttribute('y2')) + ty : ty);
            }
            if (t.getAttribute('cx') || t.getAttribute('cy')) {
                hasPosi = true;
                t.setAttribute('cx', t.getAttribute('cx') ? parseFloat(t.getAttribute('cx')) + tx : tx);
                t.setAttribute('cy', t.getAttribute('cy') ? parseFloat(t.getAttribute('cy')) + ty : ty);
            }
            if (!hasPosi) {
                if (t.tagName === 'circle') {
                    t.setAttribute('cx', tx);
                    t.setAttribute('cy', ty);
                } else {
                    t.setAttribute('x', tx);
                    t.setAttribute('y', ty);
                }
            }
        } else {
            if (t.getAttribute('d')) {
                let resultCmd = Util.setPathDValue(t.getAttribute('d'), false, tx, ty);
                t.setAttribute('d', resultCmd);
            }
        }
    }
    static setPathDValue(d, reset, tx = 0, ty = 0, diffCmds = new Map()) {
        d = d.replace(/(?<=\d)\s(?=[mMlLhHvVcCsSqQtTaAzZ])/g, '').replace(/(?<=[mMlLhHvVcCsSqQtTaA])\s(?=(\d|[-+]))/g, '').replace(/\s/g, ',');
        let cmdRegExp = new RegExp(/[mMlLhHvVcCsSqQtTaA][^mMlLhHvVcCsSqQtTaAzZ]*/g);
        let resultCmd = '';
        let cmds = d.match(cmdRegExp);
        if (cmds) {
            //get the position of the first move cmd if there is one
            let firstCmdName = cmds[0].substring(0, 1);
            let resetX = '0', resetY = '0';
            if (firstCmdName === 'm' || firstCmdName === 'M') {
                let firstCmdValues = cmds[0].substring(1).split(',');
                resetX = firstCmdValues[0];
                resetY = firstCmdValues[1];
            }

            for (let i = 0; i < cmds.length; i++) {
                let cmdName = cmds[i].substring(0, 1);
                let cmdValue = cmds[i].substring(1);
                resultCmd += cmdName;
                switch (cmdName) {
                    case 'H':
                        resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, cmdValue, reset, resetX, tx);
                        break;
                    case 'h':
                        resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, cmdValue, reset, '0', 0);
                        break;
                    case 'V':
                        resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, cmdValue, reset, resetY, ty);
                        break;
                    case 'v':
                        resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, cmdValue, reset, '0', 0);
                        break;
                    case 'M':
                    case 'L':
                    case 'T':
                    case 'C':
                    case 'S':
                    case 'Q':
                        let nums = cmdValue.split(',');
                        for (let ni = 0; ni < nums.length; ni++) {
                            if (ni % 2 === 0) {//x
                                resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, nums[ni], reset, resetX, tx);
                            } else {//y
                                resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, nums[ni], reset, resetY, ty);
                            }
                            if (ni !== nums.length - 1) {
                                resultCmd += ',';
                            }
                        }
                        break;
                    case 'm':
                    case 'l':
                    case 't':
                    case 'c':
                    case 's':
                    case 'q':
                        let nums2 = cmdValue.split(',');
                        for (let ni = 0; ni < nums2.length; ni++) {
                            resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, nums2[ni], reset, '0', 0);
                            if (ni !== nums2.length - 1) {
                                resultCmd += ',';
                            }
                        }
                        break;
                    case 'A':
                        let anums = cmdValue.split(',');
                        for (let ni = 0; ni < anums.length; ni++) {
                            if (ni === anums.length - 2) {//x
                                resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, anums[ni], reset, parseFloat(resetX) + 1, tx);
                                resultCmd += ',';
                            } else if (ni === anums.length - 1) {//y
                                resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, anums[ni], reset, parseFloat(resetY) + 1, ty);
                            } else {
                                resultCmd += anums[ni] + ',';
                            }
                        }
                        break;
                    case 'a':
                        let anums2 = cmdValue.split(',');
                        for (let ni = 0; ni < anums2.length; ni++) {
                            if (ni === anums2.length - 2) {//x
                                resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, anums2[ni], reset, '1', 0);
                                resultCmd += ',';
                            } else if (ni === anums2.length - 1) {//y
                                resultCmd = this.calNumTrans(resultCmd, diffCmds, i, cmdName, anums2[ni], reset, '1', 0);
                            } else {
                                resultCmd += anums2[ni] + ',';
                            }
                        }
                        break;
                }
            }
            if (d.charAt(d.length - 1) === 'z' || d.charAt(d.length - 1) === 'Z') {
                resultCmd += 'Z';
            }
        }
        return resultCmd;
    }

    static calNumTrans(resultCmd, diffCmds, currentCmdIdx, cmdName, cmdValue, reset, resetVal, tVal) {
        cmdName = cmdName.toLowerCase();
        if (reset) {
            if (typeof diffCmds.get(cmdName) !== 'undefined') {
                let diffCmdIdxs = diffCmds.get(cmdName);
                let flag = false;
                for (let j = 0; j < diffCmdIdxs.length; j++) {
                    if (diffCmdIdxs[j].cmdIdx === currentCmdIdx) {
                        resultCmd += resetVal;
                        flag = true;
                        break;
                    }
                }
                if (!flag) {
                    resultCmd += cmdValue;
                }
            } else {
                resultCmd += cmdValue;
            }
        } else {
            resultCmd += (parseFloat(cmdValue) + tVal);
        }
        return resultCmd;
    }

    /**
     * doing transition with path
     * @param {*} startD 
     * @param {*} endD 
     * @param {*} ratio 
     */
    static calTransD(startD, endD, ratio, startDisD, endDisD) {
        startD = startD.replace(/(?<=\d)\s(?=[mMlLhHvVcCsSqQtTaAzZ])/g, '').replace(/(?<=[mMlLhHvVcCsSqQtTaA])\s(?=(\d|[-+]))/g, '').replace(/\s/g, ',');
        endD = endD.replace(/(?<=\d)\s(?=[mMlLhHvVcCsSqQtTaAzZ])/g, '').replace(/(?<=[mMlLhHvVcCsSqQtTaA])\s(?=(\d|[-+]))/g, '').replace(/\s/g, ',');
        let resultCmd = '';
        if (ratio === 0) {
            resultCmd = startD;
        } else if (ratio === 1) {
            resultCmd = endD;
        } else {
            for (let i = 0, len = startDisD.length; i < len; i++) {
                resultCmd += (i === 0 ? 'M' : 'L') + ((endDisD[i][0] - startDisD[i][0]) * ratio + startDisD[i][0]) + ',' + ((endDisD[i][1] - startDisD[i][1]) * ratio + startDisD[i][1]);
            }
        }
        
        if (startD.charAt(startD.length - 1) === 'z' || startD.charAt(startD.length - 1) === 'Z') {
            resultCmd += 'Z';
        }
        return resultCmd;
    }

    /** startAngle should smaller than endAngle
     * @param {number} fromStartAngle start state of start angle
     * @param {number} fromEndAngle start state of end angle
     * @param {number} toStartAngle end state of start angle
     * @param {number} toEndAngle end state of end angle
     * @param {number} ratio 0-1 float number
     * @param {Function<number,number,number>} interpolateFn customize interpolate function, input is (start, end, ratio), default is linear
     * @returns {Array<number>} [startAngle, endAngle] of given ratio
     */
    static arcTransition(fromStartAngle, fromEndAngle, toStartAngle, toEndAngle, ratio, interpolateFn) {
        let validAngle = (s, e) => e < s ? (() => { throw 'startAngle should smaller than endAngle' })() : null
        validAngle(fromStartAngle, fromEndAngle)
        validAngle(toStartAngle, toEndAngle)
        let minimalAngle = (s, e) => e - Math.PI * 2 * Math.floor((e - s) / Math.PI / 2)
        // uniform angle domain within 2*PI
        fromEndAngle = minimalAngle(fromStartAngle, fromEndAngle)
        toStartAngle = minimalAngle(fromStartAngle, toStartAngle)
        toEndAngle = minimalAngle(toStartAngle, toEndAngle)
        // find the cloest domain
        toStartAngle -= Math.abs(toStartAngle - fromStartAngle) + Math.abs(toEndAngle - fromEndAngle) < 2 * Math.PI ? 0 : Math.PI * 2
        toEndAngle = minimalAngle(toStartAngle, toEndAngle)
        let interpolate = interpolateFn || ((s, e, r) => r * (e - s) + s)
        return [interpolate(fromStartAngle, toStartAngle, ratio), interpolate(fromEndAngle, toEndAngle, ratio)]
    }

    static findDiffCmds(markStatus) {
        let result = new Map();
        markStatus.forEach((statusArr, markId) => {
            let tmpDRecorder = [];
            for (let i = 0; i < statusArr.length; i++) {
                if (typeof statusArr[i] !== 'undefined') {
                    tmpDRecorder.push(!statusArr[i].d ? 'm0,0' : statusArr[i].d);
                }
            }
            if (tmpDRecorder.length > 0) {
                Util.compareD(tmpDRecorder, result);
            }
        })
        return result;
    }

    static compareD(dArr, result) {
        let cmdRegExp = new RegExp(/[mlhvcsqta][^mlhvcsqtaz]*/g);
        let firstD = dArr[0];
        firstD = firstD.toLowerCase();
        firstD = firstD.replace(/(?<=\d)\s(?=[mlhvcsqtaz])/g, '').replace(/(?<=[mlhvcsqta])\s(?=(\d|[-+]))/g, '').replace(/\s/g, ',');
        let firstDCmds = firstD.match(cmdRegExp);
        for (let i = 1; i < dArr.length; i++) {
            let tmpD = dArr[i];
            tmpD = tmpD.toLowerCase();
            tmpD = tmpD.replace(/(?<=\d)\s(?=[mlhvcsqtaz])/g, '').replace(/(?<=[mlhvcsqta])\s(?=(\d|[-+]))/g, '').replace(/\s/g, ',');
            let tmpDCmds = tmpD.match(cmdRegExp);
            for (let j = 0; j < firstDCmds.length; j++) {
                if (typeof tmpDCmds[j] === 'undefined') {
                    let cmdName = firstDCmds[j].substring(0, 1);
                    if (typeof result.get(cmdName) === 'undefined') {
                        result.set(cmdName, []);
                    }
                    let obj = {};
                    obj.cmdIdx = j;
                    obj.diffAttrIdxs = [];
                    let firstDCmdValue = firstDCmds[j].substring(1);
                    let firstDCmdValues = firstDCmdValue.split(',');
                    for (let m = 0; m < firstDCmdValues.length; m++) {
                        obj.diffAttrIdxs.push(m);
                    }
                    result.get(cmdName).push(obj);
                } else {
                    let cmdName = tmpDCmds[j].substring(0, 1);
                    let tmpDCmdValue = tmpDCmds[j].substring(1);
                    let firstDCmdValue = firstDCmds[j].substring(1);
                    if (tmpDCmdValue !== firstDCmdValue) {
                        if (typeof result.get(cmdName) === 'undefined') {
                            result.set(cmdName, []);
                        }
                        let obj = {};
                        obj.cmdIdx = j;
                        obj.diffAttrIdxs = [];
                        let tmpDCmdValues = tmpDCmdValue.split(',');
                        let firstDCmdValues = firstDCmdValue.split(',');
                        for (let m = 0; m < tmpDCmdValues.length; m++) {
                            if (Math.floor(parseFloat(tmpDCmdValues[m]) * 1000) !== Math.floor(parseFloat(firstDCmdValues[m]) * 1000)) {
                                obj.diffAttrIdxs.push(m);
                            }
                        }
                        //check whether have already added this cmd
                        let hasFlag = false;
                        for (let m = 0; m < result.get(cmdName).length; m++) {
                            if (result.get(cmdName)[m].cmdIdx === obj.cmdIdx) {
                                hasFlag = true;
                                result.get(cmdName)[m].diffAttrIdxs = [...new Set([...result.get(cmdName)[m].diffAttrIdxs, ...obj.diffAttrIdxs])];
                                break;
                            }
                        }
                        if (!hasFlag) {
                            result.get(cmdName).push(obj);
                        }
                    }
                }

            }
        }
    }

    static getTransformAttrs(dom) {
        let tr = dom.getAttribute('transform');
        if (tr) {
            tr = tr.replace(/translate|scale|rotate|\s/g, (m) => {
                return m === ' ' ? '' : '@' + m;
            });
            tr = tr.replace(/(^@*)|(@*$)/g, '').split('@');
            let scaleStr = '', transStr = '';
            for (let i = 0; i < tr.length; i++) {
                if (tr[i].indexOf('translate') >= 0) {
                    transStr = tr[i];
                } else if (tr[i].indexOf('scale') >= 0) {
                    scaleStr = tr[i];
                }
            }
            let transPosiStr = ['0', '0'], scaleNumStr = '1';
            if (transStr !== '') {
                transPosiStr = transStr.replace(/translate\(| |\)/g, '').split(',');
            }
            if (scaleStr !== '') {
                scaleNumStr = scaleStr.replace(/scale\(| |\)/g, '');
            }
            return { transNums: [parseFloat(transPosiStr[0]), parseFloat(transPosiStr[1])], scaleNum: parseFloat(scaleNumStr) };
        }
        return { transNums: [0.0, 0.0], scaleNum: 1.0 };
    }

    /**
     * check if a string contains html tag
     */
    static checkHTML(str){
        var reg = /<[^>]+>/g;
        return reg.test(str);
    }
}

Util.colorNames = new Map([['aliceblue', '#f0f8ff'], ['antiquewhite', '#faebd7'], ['aqua', '#00ffff'], ['aquamarine', '#7fffd4'], ['azure', '#f0ffff'], ['beige', '#f5f5dc'], ['bisque', '#ffe4c4'], ['black', '#000000'], ['blanchedalmond', '#ffebcd'], ['blue', '#0000ff'], ['blueviolet', '#8a2be2'], ['brown', '#a52a2a'], ['burlywood', '#deb887'], ['cadetblue', '#5f9ea0'], ['chartreuse', '#7fff00'], ['chocolate', '#d2691e'], ['coral', '#ff7f50'], ['cornflowerblue', '#6495ed'], ['cornsilk', '#fff8dc'], ['crimson', '#dc143c'], ['cyan', '#00ffff'], ['darkblue', '#00008b'], ['darkcyan', '#008b8b'], ['darkgoldenrod', '#b8860b'], ['darkgray', '#a9a9a9'], ['darkgrey', '#a9a9a9'], ['darkgreen', '#006400'], ['darkkhaki', '#bdb76b'], ['darkmagenta', '#8b008b'], ['darkolivegreen', '#556b2f'], ['darkorange', '#ff8c00'], ['darkorchid', '#9932cc'], ['darkred', '#8b0000'], ['darksalmon', '#e9967a'], ['darkseagreen', '#8fbc8f'], ['darkslateblue', '#483d8b'], ['darkslategray', '#2f4f4f'], ['darkslategrey', '#2f4f4f'], ['darkturquoise', '#00ced1'], ['darkviolet', '#9400d3'], ['deeppink', '#ff1493'], ['deepskyblue', '#00bfff'], ['dimgray', '#696969'], ['dimgrey', '#696969'], ['dodgerblue', '#1e90ff'], ['firebrick', '#b22222'], ['floralwhite', '#fffaf0'], ['forestgreen', '#228b22'], ['fuchsia', '#ff00ff'], ['gainsboro', '#dcdcdc'], ['ghostwhite', '#f8f8ff'], ['gold', '#ffd700'], ['goldenrod', '#daa520'], ['gray', '#808080'], ['grey', '#808080'], ['green', '#008000'], ['greenyellow', '#adff2f'], ['honeydew', '#f0fff0'], ['hotpink', '#ff69b4'], ['indianred ', '#cd5c5c'], ['indigo  ', '#4b0082'], ['ivory', '#fffff0'], ['khaki', '#f0e68c'], ['lavender', '#e6e6fa'], ['lavenderblush', '#fff0f5'], ['lawngreen', '#7cfc00'], ['lemonchiffon', '#fffacd'], ['lightblue', '#add8e6'], ['lightcoral', '#f08080'], ['lightcyan', '#e0ffff'], ['lightgoldenrodyellow', '#fafad2'], ['lightgray', '#d3d3d3'], ['lightgrey', '#d3d3d3'], ['lightgreen', '#90ee90'], ['lightpink', '#ffb6c1'], ['lightsalmon', '#ffa07a'], ['lightseagreen', '#20b2aa'], ['lightskyblue', '#87cefa'], ['lightslategray', '#778899'], ['lightslategrey', '#778899'], ['lightsteelblue', '#b0c4de'], ['lightyellow', '#ffffe0'], ['lime', '#00ff00'], ['limegreen', '#32cd32'], ['linen', '#faf0e6'], ['magenta', '#ff00ff'], ['maroon', '#800000'], ['mediumaquamarine', '#66cdaa'], ['mediumblue', '#0000cd'], ['mediumorchid', '#ba55d3'], ['mediumpurple', '#9370db'], ['mediumseagreen', '#3cb371'], ['mediumslateblue', '#7b68ee'], ['mediumspringgreen', '#00fa9a'], ['mediumturquoise', '#48d1cc'], ['mediumvioletred', '#c71585'], ['midnightblue', '#191970'], ['mintcream', '#f5fffa'], ['mistyrose', '#ffe4e1'], ['moccasin', '#ffe4b5'], ['navajowhite', '#ffdead'], ['navy', '#000080'], ['oldlace', '#fdf5e6'], ['olive', '#808000'], ['olivedrab', '#6b8e23'], ['orange', '#ffa500'], ['orangered', '#ff4500'], ['orchid', '#da70d6'], ['palegoldenrod', '#eee8aa'], ['palegreen', '#98fb98'], ['paleturquoise', '#afeeee'], ['palevioletred', '#db7093'], ['papayawhip', '#ffefd5'], ['peachpuff', '#ffdab9'], ['peru', '#cd853f'], ['pink', '#ffc0cb'], ['plum', '#dda0dd'], ['powderblue', '#b0e0e6'], ['purple', '#800080'], ['rebeccapurple', '#663399'], ['red', '#ff0000'], ['rosybrown', '#bc8f8f'], ['royalblue', '#4169e1'], ['saddlebrown', '#8b4513'], ['salmon', '#fa8072'], ['sandybrown', '#f4a460'], ['seagreen', '#2e8b57'], ['seashell', '#fff5ee'], ['sienna', '#a0522d'], ['silver', '#c0c0c0'], ['skyblue', '#87ceeb'], ['slateblue', '#6a5acd'], ['slategray', '#708090'], ['slategrey', '#708090'], ['snow', '#fffafa'], ['springgreen', '#00ff7f'], ['steelblue', '#4682b4'], ['tan', '#d2b48c'], ['teal', '#008080'], ['thistle', '#d8bfd8'], ['tomato', '#ff6347'], ['turquoise', '#40e0d0'], ['violet', '#ee82ee'], ['wheat', '#f5deb3'], ['white', '#ffffff'], ['whitesmoke', '#f5f5f5'], ['yellow', '#ffff00'], ['yellowgreen', '#9acd32']])

export default Util;