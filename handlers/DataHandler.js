var Promise = require("bluebird"),
Tree = require("../data_types/Tree"),
_ = require("lodash");



function DataHandler(controllerProvider) {
    this._controllerProvider = controllerProvider;

    this._getTreeFields = function() {
        var fields = {};
        fields.id = this.getFieldByAnchor(controllerProvider.ANCHOR_FIELD_ID);
        fields.parent_id = this.getFieldByAnchor(controllerProvider.ANCHOR_FIELD_PARENT_ID);
        fields.field_is_has_children = this.getFieldByAnchor(controllerProvider.ANCHOR_FIELD_NODE_HAS_CHILDREN);
        fields.field_children = this.getFieldByAnchor(controllerProvider.ANCHOR_FIELD_NODE_CHILDREN);
        return fields;
    }
}

DataHandler.prototype.deleteData = function(requestState, collectionState) {
    var dataType = this._controllerProvider.getDataType();
    if (dataType != "tree") {
        return this._controllerProvider.getModelObj().removeData(requestState.id, collectionState).then(function() {
            return {
                status: "deleted",
                source_id: requestState.id,
                target_id: requestState.id
            };
        });
    }

    var self = this;
    return this._controllerProvider.getModelObj().getData(collectionState).then(function(data) {
        var treeObj = new Tree(data, self._getTreeFields()),
        branchElements = treeObj.getBranchElements(requestState.id),
        promises = [];

        for (var i = 0; i < branchElements.length; i++) {
            var element = branchElements[i],
            elementId = element[treeObj._field_id];

            var promise = self._controllerProvider.getModelObj().removeData(elementId, collectionState);
            promises.push(promise);
        }
        return Promise.all(promises);
    }).then(function() {
        return {
            status: "deleted",
            source_id: requestState.id,
            target_id: requestState.id
        };
    });
};

DataHandler.prototype.moveData = function(requestState, collectionState) {
    return this._controllerProvider.getModelObj().changeOrderData(requestState.id, requestState.move_id, collectionState).then(function(result) {
        return {
            status: "moved",
            source_id: requestState.id,
            target_id: requestState.id
        };
    });
};

DataHandler.prototype.updateData = function(requestState, collectionState) {
    var controllerProvider = this._controllerProvider,
    fieldId = this.getFieldByAnchor(controllerProvider.ANCHOR_FIELD_ID);

    return controllerProvider.getModelObj().updateData(requestState.id, requestState.data, collectionState).then(function(updatedData) {
        return {
            status: "updated",
            source_id: requestState.id,
            target_id: updatedData[fieldId] || requestState.id
        };
    });
};

DataHandler.prototype.replaceData = function(requestState, collectionState) {
    var controllerProvider = this._controllerProvider,
    fieldId = this.getFieldByAnchor(controllerProvider.ANCHOR_FIELD_ID);

    return controllerProvider.getModelObj().replaceData(requestState.id, requestState.data, collectionState).then(function(updatedData) {
        return {
            status: "updated",
            source_id: requestState.id,
            target_id: updatedData[fieldId] || requestState.id
        };
    });
};


DataHandler.prototype.insertData = function(requestState, collectionState) {
    var controllerProvider = this._controllerProvider,
    fieldId = this.getFieldByAnchor(controllerProvider.ANCHOR_FIELD_ID);

    return controllerProvider.getModelObj().insertData(requestState.data, collectionState).then(function(insertedData) {
        return {
            status: "inserted",
            source_id: requestState.id,
            target_id: insertedData[fieldId] || requestState.id
        };
    });
};

DataHandler.prototype.getData = function(requestState, collectionState) {
    var controllerProvider = this._controllerProvider,
    dataType = controllerProvider.getDataType(),
    self = this;
    return controllerProvider.getModelObj().getData(collectionState, requestState.id).then(function(data) {
        if (dataType == controllerProvider.DATA_TYPE_TREE) {
            var treeObj = new Tree(data, self._getTreeFields());
            if (controllerProvider.getDataLoadingType() == controllerProvider.LOADING_TYPE_DYNAMIC) {
                var anchorFieldTreeSelection = self.getFieldByAnchor(controllerProvider.ANCHOR_FIELD_TREE_SELECTION),
                anchorFieldParentId = self.getFieldByAnchor(controllerProvider.ANCHOR_FIELD_PARENT_ID),
                anchorFieldId = self.getFieldByAnchor(controllerProvider.ANCHOR_FIELD_ID),
                treeItemId = "";

                if (anchorFieldTreeSelection == anchorFieldParentId)
                    treeItemId = self.getFieldDataByAnchor(requestState.data, controllerProvider.ANCHOR_FIELD_PARENT_ID);
                else if (anchorFieldTreeSelection == anchorFieldId)
                    treeItemId = requestState.id;

                if (!treeItemId)
                    treeItemId = Tree.ROOT_TREE_ID;

                data = treeObj.getItemChildren(treeItemId);
            } else
            data = treeObj.get();
        }

        return {
            status: "read",
            data: data
        };
    });
};

DataHandler.prototype.mapData = function(data, fieldsType) {
    var useOnlyMapped = this._controllerProvider.getUseOnlyMappedFields();

    function _map(data, fields) {
        var mappedData = Array.isArray(data) ? [] : {};
        for (var key in data) {
            if (fields.hasOwnProperty(key))
                mappedData[fields[key]] = data[key];
            else if (!useOnlyMapped)
                mappedData[key] = data[key];
        }
        return mappedData;
    }

    for (var key in data) {
        var currentData = data[key];
        if (typeof currentData == "object")
            data[key] = this.mapData(currentData, fieldsType);

    }

    var fields = this._controllerProvider.getFields(fieldsType);
    return _map(data, fields);
};

DataHandler.prototype.mapFields = function(fields, fieldsType) {
    var self = this;

    function _map(field) {
        var controllerFields = self._controllerProvider.getFields(fieldsType);
        return controllerFields[field] || field;
    }
    var mappedFields = [];

    if (typeof fields == "object") {
        for (var key in fields)
            mappedFields[key] = _map(fields[key]);
    } else
    mappedFields = _map(fields);

    return mappedFields;
};

DataHandler.prototype.getFieldByAnchor = function(anchor) {
    var self = this;

    function _getField(anchor) {
        var fieldsAnchors = self._controllerProvider.getFieldsAnchors(),
        field = fieldsAnchors[anchor];

        return self._controllerProvider.getFields("server")[field] || field;
    }

    if (typeof anchor == "object") {
        var fields = {};
        for (var key in anchor)
            fields[key] = _getField(key);

        return fields;
    }

    return _getField(anchor);
};

DataHandler.prototype.getFieldDataByAnchor = function(data, anchor) {
    return data[this.getFieldByAnchor(anchor)];
};

DataHandler.prototype.deleteFieldDataByAnchor = function(data, anchor) {
    delete data[this.getFieldByAnchor(anchor)];
    return data;
};

module.exports = DataHandler;
