var _ = require("lodash");

function _arrayToHash(dataArray, keyField) {
    var handler = null;
    if(typeof keyField == "function")
        handler = keyField;

    var hash = {};
    for(var i = 0; i < dataArray.length; i++) {
        var data = dataArray[i];

        if(handler) {
            handler(data);
            continue;
        }

        var key = data[keyField];
        hash[key] = data;
    }

    return hash;
}

function Tree(data, fields) {
    fields = fields || {};

    this._field_id = fields.id || "id" ;
    this._field_parent_id = fields.parent_id || "parent_id";
    this._field_children = fields.children || "children";
    this._elements = data;

    var dataTree = this._dataToTree(data);
    this._elementsHash = dataTree.elements_hash;
    this._elements = dataTree.elements;

    this.get = function() {
        return dataTree.tree;
    }
}

Tree.ROOT_TREE_ID = 0;

Tree.prototype._dataToTree = function(data) {
    data = _.clone(data, true);

    var dataHash = _arrayToHash(data, this._field_id),
        rootElements = [];

    for(var key in dataHash) {
        var node = dataHash[key],
            parentId = node[this._field_parent_id];

        if(!dataHash.hasOwnProperty(parentId)) {
            rootElements.push(data);
            continue;
        }

        var parent = dataHash[parentId];
        parent.data = parent.data || [];
        parent.data.push(node);
    }

    var rootObj = {};
    for(var i = 0; i < rootElements.length; i++) {
        var rootElement = rootElements[i];
        rootObj[this._field_parent_id] = rootElements[0][this._field_parent_id];
        rootObj.data = rootObj.data || [];
        rootObj.data.push(rootElement);
    }

    return {tree: rootObj, elements: data, elements_hash: dataHash};
};

Tree.prototype._getElementById = function(id) {
    var elements = this._elementsHash;

    for(var key in elements) {
        if(key == id)
            return elements[key];
    }

    return null;
};

Tree.prototype.getBranchElements = function(rootId) {

    function _findBranchElements(parentElement) {
        var elements = parentElement.data || [];

        for(var i = 0; i < elements.length; i++) {
            var element = elements[i];

            branchElements.push(element);
            _findBranchElements(element);
        }

        return elements;
    }

    var rootElement = this._getElementById(rootId),
        branchElements = [rootElement];

    _findBranchElements(rootElement);

    return branchElements;
};

Tree.prototype.getItemChildren = function(itemId) {
    var elements = _.clone(this._elements, true),
        children = [];

    var self = this;

    _arrayToHash(this._elements, function(element) {
        if(
            (
                (itemId == Tree.ROOT_TREE_ID) && (element[self._field_parent_id] == itemId)
            )
            || (
                (itemId != Tree.ROOT_TREE_ID) && (element[self._field_id] == itemId)
            )
        ) {
            if(element.hasOwnProperty("data")) {
                delete element.data;
                element[self._field_children] = true;
            }
            children.push(element);
        }
    });

    var node = {};
    node[this._field_parent_id] = itemId;
    node.data = children;
    return node;
};

module.exports = Tree;