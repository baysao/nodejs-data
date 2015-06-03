function FilterHandler(filterData) {
    this.SORT_ASCENDING = "ASC";
    this.SORT_DESCENDING = "DESC";

    var parsedFilterData = this.parseFilterData(filterData);
    this._fields = parsedFilterData.fields || [];
    this._filter = parsedFilterData.filter || [];
    this._sort = parsedFilterData.sort || [];

    var limit = {from: null, count: null};
    if(parsedFilterData.limit) {
        limit.from = parsedFilterData.limit.from || limit.from;
        limit.from = parsedFilterData.limit.count || limit.count;
    }

    this._limit = {from: null, count: null};
}

FilterHandler.prototype.parseFilterData = function(filterData) {
    var self = this;
    function _parseFilter(data) {
        var parsedData = [];
        for(var i = 0; i < data.length; i++) {
            var filter = data[i],
                parsedFilter = {};

            parsedFilter.field = filter.field;

            var mode = filter.mode;
            parsedFilter.mode = mode;
            parsedFilter.is_mask = (mode != self.SORT_ASCENDING) && (mode != self.SORT_DESCENDING);
            parsedData.push(parsedFilter);
        }

        return parsedData;
    }

    var parsedData = {};
    for(var key in filterData) {
        var data = filterData[key];
        switch(key) {
            case "fields":
                if(typeof data == "string")
                    data = data.replace(/\s+/g, "").split(",");
                break;

            case "filter":
            case "sort":
                data = _parseFilter(data);
                break;

            case "limit": break;

            default:
                continue;
                break;

        }

        parsedData[key] = data;
    }

    return parsedData;
};

FilterHandler.prototype.getFields = function () {
    return this._fields;
}

FilterHandler.prototype.getLimit = function () {
    return this._limit;
}

FilterHandler.prototype.eachField = function(callback) {
    var fields = this._fields;
    for(var key in fields) {
        var fieldData = callback.call(this, fields[key]);
        if(fieldData != null)
            fields[key] = fieldData
    }
};

FilterHandler.prototype.eachFilter = function(callback) {
    var filter = this._filter;
    for(var key in filter) {
        var filterData = filter[key],
            newFilterData = callback.call(this, filterData);

        if(newFilterData)
            filter[key] = newFilterData;
    }
};

FilterHandler.prototype.eachSort = function(callback) {
    var sort = this._sort;
    for(var key in sort) {
        var sortData = sort[key],
            newSortData = callback.call(this, sortData);

        if(newSortData)
            sort[key] = newSortData;
    }
};

module.exports = FilterHandler;