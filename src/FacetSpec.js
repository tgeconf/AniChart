class FacetSpec {
    constructor(type, views) {
        this._type;
        this._views;
        this.views = views;
        this.type = type;
    }

    set type(type) {
        if (typeof type !== 'undefined') {
            if (Object.keys(FacetSpec.facetType).includes(type)) {
                this._type = type;
            } else {
                console.log('the facet type has to be one of "row" or "column", setting to default value "column".')
                this._type = FacetSpec.facetType.col;
            }
        }
    }

    get type() {
        return this._type;
    }

    set views(views) {
        if (typeof views !== 'undefined') {
            //find the max number of charts in views
            let maxLen = 0;
            for (let i = 0; i < views.length; i++) {
                if (views[i].length > maxLen) {
                    maxLen = views[i].length;
                }
            }
            for (let i = 0; i < views.length; i++) {
                if (views[i].length < maxLen) {
                    let lastItem = views[i][views[i].length - 1];
                    let numDiff = maxLen - views[i].length;
                    while (numDiff > 0) {
                        views[i].push(lastItem);
                        numDiff--;
                    }
                }
            }
            this._views = views;
        }
    }

    get views() {
        return this._views;
    }
}

FacetSpec.facetType = {
    row: 'row',
    col: 'column'
}

export default FacetSpec;