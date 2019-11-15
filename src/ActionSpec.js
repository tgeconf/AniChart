import TimingSpec from './TimingSpec.js';

class ActionSpec extends TimingSpec {
    constructor() {
        super();
        this.chartIdx = 0;
        this._type = ActionSpec.actionTypes.appear;
        this.animationType = '';//not set by the user
        this._easing = ActionSpec.easingType.easeLinear;
        this._duration = 0;
        this.startTime;//not set by the user
        this.attribute = class {
            constructor() {
                this.attrName;
                this.from;
                this.to;
            }
        }
    }

    /***** getters and setters *****/
    set type(tp) {
        if (typeof tp !== 'undefined') {
            if (Object.keys(ActionSpec.actionTypes).includes(tp)) {
                this._type = tp;
            } else {
                alert('the \'type\' of action is not defined. ')
            }
        }
    }

    get type() {
        return this._type;
    }

    set easing(es) {
        if (typeof es !== 'undefined') {
            if (Object.keys(ActionSpec.easingType).includes(es)) {
                this._easing = es;
            } else {
                alert('the \'easing\' of action is not defined. ')
            }
        }
    }

    get easing() {
        return this._easing;
    }

    set duration(drtn) {
        if (typeof drtn !== 'undefined') {
            if (typeof drtn === 'number') {
                this._duration = Math.floor(drtn / (1000 / TimingSpec.FRAME_RATE)) * (1000 / TimingSpec.FRAME_RATE);
            } else {
                this._duration = drtn;
            }
        }
    }

    get duration() {
        return this._duration;
    }
    /***** end getters and setters *****/

    /**
     * init action using json obj
     * @param {JSON obj} actionJson
     */
    initAction(actionJson) {
        this.chartIdx = actionJson.chartIdx;
        this.type = actionJson.type;//action type
        this.animationType = actionJson.animationType;//animation type
        this.reference = actionJson.reference;//timingSpec reference
        this.offset = actionJson.offset;//timingSpec delay
        this.duration = actionJson.duration;//action duration
        this.easing = actionJson.easing;

        //attributes only take effect when type is custom
        if (typeof actionJson.attribute !== 'undefined') {
            this.attribute.attrName = actionJson.attribute.attrName;
            this.attribute.from = actionJson.attribute.from;
            this.attribute.to = actionJson.attribute.to;
        }
    }

    /**
     * translate template animations to 'custom' type with the transition on some visual attributes
     */
    static transToVisualAttrAction(actionJson, chartIdx, changedAttrs, dataTrans) {
        let actionJsonArr = [];

        //generate pre-render actions
        for (let i = 0; i < changedAttrs.length; i++) {
            let changedAttr = changedAttrs[i];
            let fromArr = [], toArr = [];
            dataTrans.forEach(function (transArr, markId) {
                if (chartIdx + 1 < transArr.length) {
                    if (changedAttr === 'd' || changedAttr === 'textContent' || changedAttr === 'fill' || changedAttr === 'stroke') {
                        let tmpFromItem = [markId, !transArr[chartIdx][changedAttr] ? (changedAttr === 'd' ? 'm0,0' : transArr[chartIdx][changedAttr]) : transArr[chartIdx][changedAttr]],
                            tmpToItem = [markId, !transArr[chartIdx + 1][changedAttr] ? (changedAttr === 'd' ? 'm0,0' : transArr[chartIdx + 1][changedAttr]) : transArr[chartIdx + 1][changedAttr]];
                        if (changedAttr === 'd') {
                            let tmpFromPath = document.createElementNS('http://www.w3.org/2000/svg', 'path'),
                                tmpToPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                            tmpFromPath.setAttributeNS(null, 'd', !transArr[chartIdx][changedAttr] ? 'm0,0' : transArr[chartIdx][changedAttr]);
                            tmpToPath.setAttributeNS(null, 'd', !transArr[chartIdx + 1][changedAttr] ? 'm0,0' : transArr[chartIdx + 1][changedAttr]);
                            let tmpFromPathLen = tmpFromPath.getTotalLength(),
                                tmpToPathLen = tmpToPath.getTotalLength();
                            let stepNum = 300, fromPathStepLen = tmpFromPathLen / stepNum, toPathStepLen = tmpToPathLen / stepNum;
                            let fromDiscritPath = [], toDiscritPath = [];
                            for (let i = 0; i < stepNum; i++) {
                                let tmpFromPnt = tmpFromPath.getPointAtLength(fromPathStepLen * i),
                                    tmpToPnt = tmpToPath.getPointAtLength(toPathStepLen * i);
                                fromDiscritPath.push([tmpFromPnt.x, tmpFromPnt.y]);
                                toDiscritPath.push([tmpToPnt.x, tmpToPnt.y]);
                            }
                            tmpFromItem.push(fromDiscritPath);
                            tmpToItem.push(toDiscritPath);
                        }
                        fromArr.push(tmpFromItem);
                        toArr.push(tmpToItem);
                    } else {
                        fromArr.push([markId, parseFloat(transArr[chartIdx][changedAttr])]);
                        toArr.push([markId, parseFloat(transArr[chartIdx + 1][changedAttr])]);
                    }
                }
            })
            let preObj = {
                chartIdx: actionJson.chartIdx,
                reference: TimingSpec.timingRef.previousStart,
                offset: 0,
                duration: actionJson.type === ActionSpec.actionTypes.transition ? actionJson.duration : 0,
                type: ActionSpec.actionTargets.mark,
                animationType: ActionSpec.targetAnimationType.custom,
                attribute: {
                    attrName: changedAttr,
                    from: fromArr,
                    to: toArr
                }
            }

            actionJsonArr.push(preObj);
        }

        if (actionJson.type !== ActionSpec.actionTypes.transition) {
            let tmpObj = {
                chartIdx: actionJson.chartIdx,
                reference: actionJson.reference,//timingSpec offset reference
                offset: actionJson.offset,
                easing: actionJson.easing,
                duration: typeof actionJson.duration === 'undefined' ? 300 : actionJson.duration,
                type: ActionSpec.actionTargets.mask
            };

            switch (actionJson.type) {
                case ActionSpec.actionTypes.fade:
                    tmpObj.animationType = ActionSpec.targetAnimationType.fade;
                    tmpObj.attribute = {
                        attrName: 'opacity',
                        from: 1,
                        to: 0
                    };
                    break;
                case ActionSpec.actionTypes.fadeOut:
                    tmpObj.animationType = ActionSpec.targetAnimationType.fade;
                    tmpObj.attribute = {
                        attrName: 'opacity',
                        from: 0,
                        to: 1
                    };
                    break;
                case ActionSpec.actionTypes.wipeBottom:
                    tmpObj.animationType = ActionSpec.targetAnimationType.wipe;
                    tmpObj.attribute = {
                        attrName: 'height',
                        from: 1,
                        to: 0
                    };
                    break;
                case ActionSpec.actionTypes.wipeOutFromTop:
                    tmpObj.animationType = ActionSpec.targetAnimationType.wipe;
                    tmpObj.attribute = {
                        attrName: 'height',
                        from: 0,
                        to: 1
                    };
                    break;
                case ActionSpec.actionTypes.wipeTop:
                    tmpObj.animationType = ActionSpec.targetAnimationType.move;
                    tmpObj.attribute = {
                        attrName: 'y',
                        from: 0,
                        to: 1
                    };
                    break;
                case ActionSpec.actionTypes.wipeOutFromBottom:
                    tmpObj.animationType = ActionSpec.targetAnimationType.move;
                    tmpObj.attribute = {
                        attrName: 'y',
                        from: 1,
                        to: 0
                    };
                    break;
                case ActionSpec.actionTypes.wipeLeft:
                    tmpObj.animationType = ActionSpec.targetAnimationType.move;
                    tmpObj.attribute = {
                        attrName: 'x',
                        from: 0,
                        to: 1
                    };
                    break;
                case ActionSpec.actionTypes.wipeOutFromRight:
                    tmpObj.animationType = ActionSpec.targetAnimationType.move;
                    tmpObj.attribute = {
                        attrName: 'x',
                        from: 1,
                        to: 0
                    };
                    break;
                case ActionSpec.actionTypes.wipeRight:
                    tmpObj.animationType = ActionSpec.targetAnimationType.wipe;
                    tmpObj.attribute = {
                        attrName: 'width',
                        from: 1,
                        to: 0
                    };
                    break;
                case ActionSpec.actionTypes.wipeOutFromLeft:
                    tmpObj.animationType = ActionSpec.targetAnimationType.wipe;
                    tmpObj.attribute = {
                        attrName: 'width',
                        from: 0,
                        to: 1
                    };
                    break;
                case ActionSpec.actionTypes.wheel:
                    tmpObj.animationType = ActionSpec.targetAnimationType.wheel;
                    tmpObj.attribute = {
                        attrName: 'startAngle',
                        from: 0,
                        to: 1
                    };
                    break;
                case ActionSpec.actionTypes.wheelOut:
                    tmpObj.animationType = ActionSpec.targetAnimationType.wheel;
                    tmpObj.attribute = {
                        attrName: 'startAngle',
                        from: 1,
                        to: 0
                    };
                    break;
                case ActionSpec.actionTypes.circle:
                    tmpObj.animationType = ActionSpec.targetAnimationType.circle;
                    tmpObj.attribute = {
                        attrName: 'innerRadius',
                        from: 0,
                        to: 1
                    };
                    break;
                case ActionSpec.actionTypes.circleOut:
                    tmpObj.animationType = ActionSpec.targetAnimationType.circle;
                    tmpObj.attribute = {
                        attrName: 'innerRadius',
                        from: 1,
                        to: 0
                    };
                    break;
                case ActionSpec.actionTypes.grow:
                    tmpObj.type = ActionSpec.actionTargets.mark;
                    tmpObj.animationType = ActionSpec.targetAnimationType.grow;
                    tmpObj.attribute = {
                        attrName: 'stroke-dashoffset',
                        from: 1,
                        to: 0
                    };
                    break;
                case ActionSpec.actionTypes.degrow:
                    tmpObj.type = ActionSpec.actionTargets.mark;
                    tmpObj.animationType = ActionSpec.targetAnimationType.grow;
                    tmpObj.attribute = {
                        attrName: 'stroke-dashoffset',
                        from: 0,
                        to: 1
                    };
                    break;
                case ActionSpec.actionTypes.appear:
                    tmpObj.duration = 1000 / TimingSpec.FRAME_RATE;
                    tmpObj.animationType = ActionSpec.targetAnimationType.fade;
                    tmpObj.attribute = {
                        attrName: 'opacity',
                        from: 1,
                        to: 0
                    };
                    break;
                case ActionSpec.actionTypes.zoom:
                    tmpObj.type = ActionSpec.actionTargets.mark;
                    tmpObj.reference = TimingSpec.timingRef.previousStart;
                    tmpObj.offset = 0;
                    tmpObj.animationType = ActionSpec.targetAnimationType.wipe;
                    tmpObj.attribute = {
                        attrName: 'width',
                        from: 0,
                        to: 1
                    };

                    let tmpObj2 = {
                        chartIdx: actionJson.chartIdx,
                        easing: actionJson.easing,
                        duration: typeof actionJson.duration === 'undefined' ? 300 : actionJson.duration,
                        reference: actionJson.reference,//timingSpec offset reference
                        offset: actionJson.offset,
                        type: ActionSpec.actionTargets.mask,
                        animationType: ActionSpec.targetAnimationType.wipe,
                        attribute: {
                            attrName: 'height',
                            from: 1,
                            to: 0
                        }
                    };
                    actionJsonArr.push(tmpObj2);

                    break;
                case ActionSpec.actionTypes.custom:
                    tmpObj.type = ActionSpec.actionTargets.mark;
                    tmpObj.animationType = ActionSpec.targetAnimationType.custom;
                    tmpObj.attribute = {};
                    if (typeof actionJson.attribute !== 'undefined') {
                        tmpObj.attribute = {
                            attrName: actionJson.attribute.attrName,
                            from: actionJson.attribute.from,
                            to: actionJson.attribute.to
                        }
                    }
                    break;
            }
            actionJsonArr.push(tmpObj);
        }

        return actionJsonArr;
    }

    /**
     * calculate the total duration of all the actions
     * @param {Array<ActionSpec>} actionArr 
     * @param {Map} durationAttrValues: key: data attr name, value Map{key: markId, value: attr value}
     */
    static calActionDuration(actionArr, durationAttrValues, domMarks) {
        let wholeStart = 0, wholeEnd = -100000;//start time of the earliest action and end time of the lastst action
        let lastStart = 0, lastEnd = 0;
        let durationWithAttr = false;

        for (let i = 0; i < actionArr.length; i++) {
            let tmpStartMap, tmpEndMap = new Map();
            tmpStartMap = actionArr[i].calOffsetTime(lastStart, lastEnd, 0, domMarks);//change to retunr value of Map

            //ignore the influence of the animation for the boundary of the mask
            if (i > 0) {
                if (actionArr[i - 1].animationType === ActionSpec.targetAnimationType.mistake) {
                    tmpStartMap.forEach(function (tmpStart, markId) {
                        tmpStartMap.set(markId, tmpStart - actionArr[i - 1].offset);
                    })
                }
            }

            let minTmpStart = 1000000, maxTmpEnd = -100000;
            actionArr[i].offsetStart = new Map();
            tmpStartMap.forEach(function (tmpStart, markId) {
                let tmpEnd = 0;
                if (typeof actionArr[i].duration === 'object') {
                    durationWithAttr = true;
                    tmpEnd = tmpStart;
                } else if (typeof actionArr[i].duration === 'number') {
                    tmpEnd = tmpStart + actionArr[i].duration;
                }
                tmpEndMap.set(markId, tmpEnd);
                actionArr[i].offsetStart.set(markId, tmpStart);

                if (tmpStart < minTmpStart) {
                    minTmpStart = tmpStart;
                }
                if (tmpEnd > maxTmpEnd) {
                    maxTmpEnd = tmpEnd;
                }
                if (tmpStart < wholeStart) {
                    wholeStart = tmpStart;
                }
                if (tmpEnd > wholeEnd) {
                    wholeEnd = tmpEnd;
                }
            })

            lastStart = minTmpStart;
            lastEnd = maxTmpEnd;
        }

        let tmpResultDuration = wholeEnd - wholeStart;
        let resultDurations = new Map();//key: markId, value: duraiton of this mark
        let minValueEachAttr = new Map();
        if (durationWithAttr) {//add duration with the attribute values
            //find the min value for each attr
            durationAttrValues.forEach(function (attrs, markId) {
                attrs.forEach(function (attrValue, attrName) {
                    if (typeof minValueEachAttr.get(attrName) === 'undefined' || attrValue[0] < minValueEachAttr.get(attrName)) {
                        minValueEachAttr.set(attrName, attrValue[0]);
                    }
                })
            })
            durationAttrValues.forEach(function (attrs, markId) {
                let tmpExtraDuration = 0;
                attrs.forEach(function (attrValue, attrName) {
                    let minAttrValue = minValueEachAttr.get(attrName);

                    tmpExtraDuration += attrValue[1] * attrValue[0] / minAttrValue;
                })
                resultDurations.set(markId, tmpResultDuration + tmpExtraDuration);
            })
        } else {//directly set the duration of each mark with tmpResultDuration
            durationAttrValues.forEach(function (value, markId) {
                resultDurations.set(markId, tmpResultDuration);
            })
        }
        return [resultDurations, minValueEachAttr, actionArr];
    }
}

ActionSpec.actionTypes = {
    fade: 'fade',
    wipeBottom: 'wipe bottom',
    wipeTop: 'wipe top',
    wipeLeft: 'wipe left',
    wipeRight: 'wipe right',
    wheel: 'wheel',
    appear: 'appear',
    circle: 'circle',
    grow: 'grow',
    custom: 'custom',
    fadeOut: 'fade out',
    wipeOutFromLeft: 'wipe out from left',
    wipeOutFromTop: 'wipe out from top',
    wipeOutFromRight: 'wipe out from right',
    wipeOutFromBottom: 'wipe out from bottom',
    wheelOut: 'wheel out',
    circleOut: 'circle out',
    degrow: 'degrow',
    transition: 'magic move',
    zoom: 'zoom',
    mark: 'mask',
    mask: 'mark'
}

ActionSpec.actionTargets = {
    mark: 'mark',
    mask: 'mask'
}

ActionSpec.targetAnimationType = {
    fade: 'fade',
    wipe: 'wipe',
    move: 'move',
    wheel: 'wheel',
    circle: 'circle',
    appear: 'appear',
    grow: 'grow',
    custom: 'custom',
    mistake: 'mistake'
}

ActionSpec.easingType = {
    easeLinear: 'easeLinear',
    easeInQuad: 'easeInQuad',
    easeOutQuad: 'easeOutQuad',
    easeInOutQuad: 'easeInOutQuad',
    easeInCubic: 'easeInCubic',
    easeOutCubic: 'easeOutCubic',
    easeInOutCubic: 'easeInOutCubic',
    easeOutBounce: 'easeOutBounce'
}

export default ActionSpec;