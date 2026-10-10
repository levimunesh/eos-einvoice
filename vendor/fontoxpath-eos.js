// ../gh/fontoxpath/src/getBuckets.ts
function createBuckets(nodeType, localName) {
  const buckets = [];
  if (nodeType === 2 /* ATTRIBUTE_NODE */ || nodeType === 1 /* ELEMENT_NODE */) {
    buckets.push("type-1-or-type-2");
  }
  buckets.push(`type-${nodeType}`);
  if (localName) {
    buckets.push(`name-${localName}`);
  }
  return buckets;
}
function getBucketsForPointer(pointer, domFacade2) {
  const nodeType = domFacade2.getNodeType(pointer);
  let localName;
  if (nodeType === 2 /* ATTRIBUTE_NODE */ || nodeType === 1 /* ELEMENT_NODE */) {
    localName = domFacade2.getLocalName(pointer);
  }
  return createBuckets(nodeType, localName);
}
function getBucketsForNode(node) {
  let nodeType = node.nodeType;
  if (nodeType === 4 /* CDATA_SECTION_NODE */) {
    nodeType = 3 /* TEXT_NODE */;
  }
  let localName;
  if (nodeType === 2 /* ATTRIBUTE_NODE */ || nodeType === 1 /* ELEMENT_NODE */) {
    localName = node.localName;
  }
  return createBuckets(nodeType, localName);
}

// ../gh/fontoxpath/src/domFacade/ExternalDomFacade.ts
var ExternalDomFacade = class {
  ["getAllAttributes"](node, bucket = null) {
    if (node.nodeType !== 1 /* ELEMENT_NODE */) {
      return [];
    }
    const attrs = Array.from(node["attributes"]);
    if (bucket === null) {
      return attrs;
    }
    return attrs.filter((attr) => getBucketsForNode(attr).includes(bucket));
  }
  ["getAttribute"](node, attributeName) {
    if (node.nodeType !== 1 /* ELEMENT_NODE */) {
      return null;
    }
    return node["getAttribute"](attributeName);
  }
  ["getChildNodes"](node, bucket = null) {
    const childNodes = Array.from(node["childNodes"]);
    if (bucket === null) {
      return childNodes;
    }
    return childNodes.filter((child) => getBucketsForNode(child).includes(bucket));
  }
  ["getData"](node) {
    return node["nodeType"] === 2 /* ATTRIBUTE_NODE */ ? node["value"] : node["data"];
  }
  ["getFirstChild"](node, bucket = null) {
    for (let child = node["firstChild"]; child; child = child["nextSibling"]) {
      if (bucket === null || getBucketsForNode(child).includes(bucket)) {
        return child;
      }
    }
    return null;
  }
  ["getLastChild"](node, bucket = null) {
    for (let child = node["lastChild"]; child; child = child["previousSibling"]) {
      if (bucket === null || getBucketsForNode(child).includes(bucket)) {
        return child;
      }
    }
    return null;
  }
  ["getNextSibling"](node, bucket = null) {
    for (let sibling = node["nextSibling"]; sibling; sibling = sibling["nextSibling"]) {
      if (bucket === null || getBucketsForNode(sibling).includes(bucket)) {
        return sibling;
      }
    }
    return null;
  }
  ["getParentNode"](node, bucket = null) {
    const parentNode = node["nodeType"] === 2 /* ATTRIBUTE_NODE */ ? node["ownerElement"] : node["parentNode"];
    if (!parentNode) {
      return null;
    }
    if (bucket === null || getBucketsForNode(parentNode).includes(bucket)) {
      return parentNode;
    }
    return null;
  }
  ["getPreviousSibling"](node, bucket = null) {
    for (let sibling = node["previousSibling"]; sibling; sibling = sibling["previousSibling"]) {
      if (bucket === null || getBucketsForNode(sibling).includes(bucket)) {
        return sibling;
      }
    }
    return null;
  }
};

// ../gh/fontoxpath/src/documentWriter/domBackedDocumentWriter.ts
var DomBackedDocumentWriter = class {
  insertBefore(parent, newNode, referenceNode) {
    return parent["insertBefore"](newNode, referenceNode);
  }
  removeAttributeNS(node, namespace, name2) {
    return node["removeAttributeNS"](namespace, name2);
  }
  removeChild(parent, child) {
    return parent["removeChild"](child);
  }
  setAttributeNS(node, namespace, name2, value) {
    node["setAttributeNS"](namespace, name2, value);
  }
  setData(node, data) {
    node["data"] = data;
  }
};
var domBackedDocumentWriter_default = new DomBackedDocumentWriter();

// ../gh/fontoxpath/src/documentWriter/wrapExternalDocumentWriter.ts
var WrappingDocumentWriter = class {
  constructor(externalDocumentWriter) {
    this._externalDocumentWriter = externalDocumentWriter;
  }
  insertBefore(parent, newNode, referenceNode) {
    return this._externalDocumentWriter["insertBefore"](parent, newNode, referenceNode);
  }
  removeAttributeNS(node, namespace, name2) {
    return this._externalDocumentWriter["removeAttributeNS"](node, namespace, name2);
  }
  removeChild(parent, child) {
    return this._externalDocumentWriter["removeChild"](parent, child);
  }
  setAttributeNS(node, namespace, name2, value) {
    this._externalDocumentWriter["setAttributeNS"](node, namespace, name2, value);
  }
  setData(node, data) {
    this._externalDocumentWriter["setData"](node, data);
  }
};
function wrapExternalDocumentWriter(externalDocumentWriter) {
  return new WrappingDocumentWriter(externalDocumentWriter);
}

// ../gh/fontoxpath/src/domClone/Pointer.ts
function isTinyNode(node) {
  return node.isTinyNode !== void 0;
}

// ../gh/fontoxpath/src/domFacade/DomFacade.ts
function createPointer(node, parent, offset) {
  let graftAncestor = null;
  if (parent) {
    if (isTinyNode(parent.node)) {
      graftAncestor = {
        graftAncestor: parent.graftAncestor,
        offset,
        parent: parent.node
      };
    } else if (parent.graftAncestor) {
      graftAncestor = parent.graftAncestor;
    }
  }
  const newPointer = { node, graftAncestor };
  return newPointer;
}
var DomFacade = class {
  constructor(_domFacade) {
    this._domFacade = _domFacade;
    this.orderOfDetachedNodes = [];
  }
  getAllAttributePointers(pointer, bucket = null) {
    return this.getAllAttributes(pointer.node, bucket).map(
      (attributeNode) => createPointer(attributeNode, pointer, attributeNode.nodeName)
    );
  }
  getAllAttributes(node, bucket = null) {
    return isTinyNode(node) ? node.attributes : this._domFacade["getAllAttributes"](node, bucket);
  }
  getAttribute(pointer, attributeName) {
    const node = pointer.node;
    if (isTinyNode(node)) {
      const attributeNode = node.attributes.find((attr) => attributeName === attr.name);
      return attributeNode ? attributeNode.value : null;
    } else {
      const value = this._domFacade["getAttribute"](node, attributeName);
      return value ? value : null;
    }
  }
  getChildNodePointers(parentPointer, bucket = null) {
    return this.getChildNodes(parentPointer.node, bucket).map(
      (childNode, index) => createPointer(childNode, parentPointer, index)
    );
  }
  getChildNodes(parentNode, bucket = null) {
    const childNodes = isTinyNode(parentNode) ? parentNode.childNodes : this._domFacade["getChildNodes"](parentNode, bucket);
    if (parentNode.nodeType === 9 /* DOCUMENT_NODE */) {
      return childNodes.filter(
        (childNode) => childNode["nodeType"] !== 10 /* DOCUMENT_TYPE_NODE */
      );
    }
    return childNodes;
  }
  getData(node) {
    if (isTinyNode(node)) {
      return node.nodeType === 2 /* ATTRIBUTE_NODE */ ? node.value : node.data;
    }
    return this._domFacade["getData"](node) || "";
  }
  /**
   * Get the node or tiny node children of a given node or tiny node. Do not use if from those
   * children a new (upwards) traversal will be started since the parent relationship might be lost.
   */
  getDataFromPointer(pointer) {
    return this.getData(pointer.node);
  }
  getFirstChildPointer(parentPointer, bucket = null) {
    const parentNode = parentPointer.node;
    let firstChild;
    if (isTinyNode(parentNode)) {
      firstChild = parentNode.childNodes[0];
    } else {
      let child = this._domFacade["getFirstChild"](parentNode, bucket);
      if (child && child.nodeType === 10 /* DOCUMENT_TYPE_NODE */) {
        child = this._domFacade["getNextSibling"](child);
      }
      firstChild = child;
    }
    return firstChild ? createPointer(firstChild, parentPointer, 0) : null;
  }
  getLastChildPointer(parentPointer, bucket = null) {
    const parentNode = parentPointer.node;
    let lastChild;
    let lastIndex;
    if (isTinyNode(parentNode)) {
      lastIndex = parentNode.childNodes.length - 1;
      lastChild = parentNode.childNodes[lastIndex];
    } else {
      let child = this._domFacade["getLastChild"](parentNode, bucket);
      if (child && child.nodeType === 10 /* DOCUMENT_TYPE_NODE */) {
        child = this._domFacade["getPreviousSibling"](child);
      }
      lastChild = child;
      lastIndex = this.getChildNodes(parentPointer.node, bucket).length - 1;
    }
    return lastChild ? createPointer(lastChild, parentPointer, lastIndex) : null;
  }
  getLocalName(pointer) {
    return pointer.node.localName;
  }
  getNamespaceURI(pointer) {
    return pointer.node.namespaceURI;
  }
  getNextSiblingPointer(pointer, bucket = null) {
    const node = pointer.node;
    let nextSibling;
    let parentPointer;
    let nextSiblingIndex;
    const graftAncestor = pointer.graftAncestor;
    if (isTinyNode(node)) {
      if (graftAncestor) {
        nextSiblingIndex = graftAncestor.offset + 1;
        nextSibling = graftAncestor.parent.childNodes[nextSiblingIndex];
      }
    } else {
      if (graftAncestor) {
        nextSiblingIndex = graftAncestor.offset + 1;
        parentPointer = this.getParentNodePointer(pointer, null);
        nextSibling = this.getChildNodes(parentPointer.node, bucket)[nextSiblingIndex];
      } else {
        nextSibling = node;
        while (nextSibling) {
          nextSibling = this._domFacade["getNextSibling"](nextSibling, bucket);
          if (nextSibling && nextSibling.nodeType !== 10 /* DOCUMENT_TYPE_NODE */) {
            break;
          }
        }
        return nextSibling ? {
          node: nextSibling,
          graftAncestor: null
        } : null;
      }
    }
    return nextSibling ? createPointer(
      nextSibling,
      parentPointer || this.getParentNodePointer(pointer, bucket),
      nextSiblingIndex
    ) : null;
  }
  getNodeName(pointer) {
    return pointer.node.nodeName;
  }
  getNodeType(pointer) {
    return pointer.node.nodeType;
  }
  /**
   * Get the raw parent node of a concrete node.
   *
   * Note that this code should not be called with node that comes from a pointer with a graft,
   * since that graft will not be used.
   *
   * Also, tinyNodes do not have a logical parent, so that will also not work.
   *
   * This method can be used to more performantly get the parent of a node, to for instance more
   * quickly determine the ancestry of a node that is not created nor cloned into another node.
   */
  getParentNode(node, bucket = null) {
    return this._domFacade["getParentNode"](node, bucket);
  }
  getParentNodePointer(pointer, bucket = null) {
    const childNode = pointer.node;
    const graftAncestor = pointer.graftAncestor;
    let parentNode;
    let newGraftAncestor;
    if (!graftAncestor) {
      if (isTinyNode(childNode)) {
        return null;
      }
      parentNode = this.getParentNode(childNode, bucket);
      newGraftAncestor = null;
    } else if (
      // check the child at graftAncestor is that node
      typeof graftAncestor.offset === "number" && childNode === graftAncestor.parent.childNodes[graftAncestor.offset] || typeof graftAncestor.offset === "string" && childNode === graftAncestor.parent.attributes.find(
        (e4) => graftAncestor.offset === e4.nodeName
      )
    ) {
      parentNode = graftAncestor.parent;
      newGraftAncestor = graftAncestor.graftAncestor;
    } else {
      parentNode = this.getParentNode(childNode, bucket);
      newGraftAncestor = graftAncestor;
    }
    return parentNode ? { node: parentNode, graftAncestor: newGraftAncestor } : null;
  }
  getPrefix(pointer) {
    return pointer.node.prefix;
  }
  getPreviousSiblingPointer(pointer, bucket = null) {
    const node = pointer.node;
    let previousSibling;
    let parentPointer;
    const graftAncestor = pointer.graftAncestor;
    let previousSiblingIndex;
    if (isTinyNode(node)) {
      if (graftAncestor) {
        previousSiblingIndex = graftAncestor.offset - 1;
        previousSibling = graftAncestor.parent.childNodes[previousSiblingIndex];
      }
    } else {
      if (graftAncestor) {
        previousSiblingIndex = graftAncestor.offset - 1;
        parentPointer = this.getParentNodePointer(pointer, null);
        previousSibling = this.getChildNodes(parentPointer.node, bucket)[previousSiblingIndex];
      } else {
        previousSibling = node;
        while (previousSibling) {
          previousSibling = this._domFacade["getPreviousSibling"](
            previousSibling,
            bucket
          );
          if (previousSibling && previousSibling.nodeType !== 10 /* DOCUMENT_TYPE_NODE */) {
            break;
          }
        }
        return previousSibling ? {
          node: previousSibling,
          graftAncestor: null
        } : null;
      }
    }
    return previousSibling ? createPointer(
      previousSibling,
      parentPointer || this.getParentNodePointer(pointer, bucket),
      previousSiblingIndex
    ) : null;
  }
  // Can be used to create an extra frame when tracking dependencies
  getRelatedNodes(node, callback) {
    return callback(node, this);
  }
  getTarget(pointer) {
    return pointer.node.target;
  }
  unwrap() {
    return this._domFacade;
  }
};
var DomFacade_default = DomFacade;

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_arrays_get.ts
var arrayGet = (_dynamicContext, _executionParameters, _staticContext, arraySequence, positionSequence) => {
  return positionSequence.mapAll(
    ([position]) => arraySequence.mapAll(([array]) => {
      const positionValue = position.value;
      if (positionValue <= 0 || positionValue > array.members.length) {
        throw new Error("FOAY0001: array position out of bounds.");
      }
      return array.members[positionValue - 1]();
    })
  );
};
var builtInFunctions_arrays_get_default = arrayGet;

// ../gh/fontoxpath/src/expressions/staticallyKnownNamespaces.ts
var staticallyKnownNamespaceByPrefix = {
  ["xml"]: "http://www.w3.org/XML/1998/namespace" /* XML_NAMESPACE_URI */,
  ["xs"]: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
  ["fn"]: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
  ["map"]: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
  ["array"]: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
  ["math"]: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
  ["fontoxpath"]: "http://fontoxml.com/fontoxpath" /* FONTOXPATH_NAMESPACE_URI */,
  ["local"]: "http://www.w3.org/2005/xquery-local-functions" /* LOCAL_NAMESPACE_URI */
};
function registerStaticallyKnownNamespace(prefix2, namespaceURI) {
  if (staticallyKnownNamespaceByPrefix[prefix2]) {
    throw new Error("Prefix already registered: Do not register the same prefix twice.");
  }
  staticallyKnownNamespaceByPrefix[prefix2] = namespaceURI;
}

// ../gh/fontoxpath/src/expressions/dataTypes/Value.ts
var Value = class {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
};
var typeToStringMap = {
  [0 /* XSBOOLEAN */]: "xs:boolean",
  [1 /* XSSTRING */]: "xs:string",
  [2 /* XSNUMERIC */]: "xs:numeric",
  [3 /* XSDOUBLE */]: "xs:double",
  [4 /* XSDECIMAL */]: "xs:decimal",
  [5 /* XSINTEGER */]: "xs:integer",
  [6 /* XSFLOAT */]: "xs:float",
  [7 /* XSDATE */]: "xs:date",
  [8 /* XSTIME */]: "xs:time",
  [9 /* XSDATETIME */]: "xs:dateTime",
  [10 /* XSDATETIMESTAMP */]: "xs:dateTimeStamp",
  [11 /* XSGYEARMONTH */]: "xs:gYearMonth",
  [12 /* XSGYEAR */]: "xs:gYear",
  [13 /* XSGMONTHDAY */]: "xs:gMonthDay",
  [14 /* XSGMONTH */]: "xs:gMonth",
  [15 /* XSGDAY */]: "xs:gDay",
  [16 /* XSYEARMONTHDURATION */]: "xs:yearMonthDuration",
  [17 /* XSDAYTIMEDURATION */]: "xs:dayTimeDuration",
  [18 /* XSDURATION */]: "xs:duration",
  [19 /* XSUNTYPEDATOMIC */]: "xs:untypedAtomic",
  [20 /* XSANYURI */]: "xs:anyURI",
  [21 /* XSBASE64BINARY */]: "xs:base64Binary",
  [22 /* XSHEXBINARY */]: "xs:hexBinary",
  [23 /* XSQNAME */]: "xs:QName",
  [24 /* XSNCNAME */]: "xs:NCName",
  [25 /* XSNAME */]: "xs:Name",
  [26 /* XSENTITY */]: "xs:ENTITY",
  [27 /* XSNONPOSITIVEINTEGER */]: "xs:nonPositiveInteger",
  [28 /* XSNEGATIVEINTEGER */]: "xs:negativeInteger",
  [29 /* XSPOSITIVEINTEGER */]: "xs:positiveInteger",
  [30 /* XSNONNEGATIVEINTEGER */]: "xs:nonNegativeInteger",
  [31 /* XSLONG */]: "xs:long",
  [32 /* XSINT */]: "xs:int",
  [33 /* XSSHORT */]: "xs:short",
  [34 /* XSBYTE */]: "xs:byte",
  [35 /* XSUNSIGNEDINT */]: "xs:unsignedInt",
  [36 /* XSUNSIGNEDLONG */]: "xs:unsignedLong",
  [37 /* XSUNSIGNEDBYTE */]: "xs:unsignedByte",
  [38 /* XSUNSIGNEDSHORT */]: "xs:unsignedShort",
  [39 /* XSERROR */]: "xs:error",
  [40 /* XSENTITIES */]: "xs:ENTITIES",
  [41 /* XSIDREF */]: "xs:IDREF",
  [42 /* XSID */]: "xs:ID",
  [43 /* XSIDREFS */]: "xs:IDREFS",
  [44 /* XSNOTATION */]: "xs:NOTATION",
  [45 /* XSANYSIMPLETYPE */]: "xs:anySimpleType",
  [46 /* XSANYATOMICTYPE */]: "xs:anyAtomicType",
  [47 /* ATTRIBUTE */]: "attribute()",
  [48 /* XSNORMALIZEDSTRING */]: "xs:normalizedString",
  [49 /* XSNMTOKENS */]: "xs:NMTOKENS",
  [50 /* XSNMTOKEN */]: "xs:NMTOKEN",
  [51 /* XSLANGUAGE */]: "xs:language",
  [52 /* XSTOKEN */]: "xs:token",
  [53 /* NODE */]: "node()",
  [54 /* ELEMENT */]: "element()",
  [55 /* DOCUMENTNODE */]: "document-node()",
  [56 /* TEXT */]: "text()",
  [57 /* PROCESSINGINSTRUCTION */]: "processing-instruction()",
  [58 /* COMMENT */]: "comment()",
  [59 /* ITEM */]: "item()",
  [60 /* FUNCTION */]: "function(*)",
  [61 /* MAP */]: "map(*)",
  [62 /* ARRAY */]: "array(*)",
  [63 /* NONE */]: "none"
};
var stringToValueTypeMap = {
  "xs:boolean": 0 /* XSBOOLEAN */,
  "xs:string": 1 /* XSSTRING */,
  "xs:numeric": 2 /* XSNUMERIC */,
  "xs:double": 3 /* XSDOUBLE */,
  "xs:decimal": 4 /* XSDECIMAL */,
  "xs:integer": 5 /* XSINTEGER */,
  "xs:float": 6 /* XSFLOAT */,
  "xs:date": 7 /* XSDATE */,
  "xs:time": 8 /* XSTIME */,
  "xs:dateTime": 9 /* XSDATETIME */,
  "xs:dateTimeStamp": 10 /* XSDATETIMESTAMP */,
  "xs:gYearMonth": 11 /* XSGYEARMONTH */,
  "xs:gYear": 12 /* XSGYEAR */,
  "xs:gMonthDay": 13 /* XSGMONTHDAY */,
  "xs:gMonth": 14 /* XSGMONTH */,
  "xs:gDay": 15 /* XSGDAY */,
  "xs:yearMonthDuration": 16 /* XSYEARMONTHDURATION */,
  "xs:dayTimeDuration": 17 /* XSDAYTIMEDURATION */,
  "xs:duration": 18 /* XSDURATION */,
  "xs:untypedAtomic": 19 /* XSUNTYPEDATOMIC */,
  "xs:anyURI": 20 /* XSANYURI */,
  "xs:base64Binary": 21 /* XSBASE64BINARY */,
  "xs:hexBinary": 22 /* XSHEXBINARY */,
  "xs:QName": 23 /* XSQNAME */,
  "xs:NCName": 24 /* XSNCNAME */,
  "xs:Name": 25 /* XSNAME */,
  "xs:ENTITY": 26 /* XSENTITY */,
  "xs:nonPositiveInteger": 27 /* XSNONPOSITIVEINTEGER */,
  "xs:negativeInteger": 28 /* XSNEGATIVEINTEGER */,
  "xs:positiveInteger": 29 /* XSPOSITIVEINTEGER */,
  "xs:nonNegativeInteger": 30 /* XSNONNEGATIVEINTEGER */,
  "xs:long": 31 /* XSLONG */,
  "xs:int": 32 /* XSINT */,
  "xs:short": 33 /* XSSHORT */,
  "xs:byte": 34 /* XSBYTE */,
  "xs:unsignedInt": 35 /* XSUNSIGNEDINT */,
  "xs:unsignedLong": 36 /* XSUNSIGNEDLONG */,
  "xs:unsignedByte": 37 /* XSUNSIGNEDBYTE */,
  "xs:unsignedShort": 38 /* XSUNSIGNEDSHORT */,
  "xs:error": 39 /* XSERROR */,
  "xs:ENTITIES": 40 /* XSENTITIES */,
  "xs:IDREF": 41 /* XSIDREF */,
  "xs:ID": 42 /* XSID */,
  "xs:IDREFS": 43 /* XSIDREFS */,
  "xs:NOTATION": 44 /* XSNOTATION */,
  "xs:anySimpleType": 45 /* XSANYSIMPLETYPE */,
  "xs:anyAtomicType": 46 /* XSANYATOMICTYPE */,
  "attribute()": 47 /* ATTRIBUTE */,
  "xs:normalizedString": 48 /* XSNORMALIZEDSTRING */,
  "xs:NMTOKENS": 49 /* XSNMTOKENS */,
  "xs:NMTOKEN": 50 /* XSNMTOKEN */,
  "xs:language": 51 /* XSLANGUAGE */,
  "xs:token": 52 /* XSTOKEN */,
  "node()": 53 /* NODE */,
  "element()": 54 /* ELEMENT */,
  "document-node()": 55 /* DOCUMENTNODE */,
  "text()": 56 /* TEXT */,
  "processing-instruction()": 57 /* PROCESSINGINSTRUCTION */,
  "comment()": 58 /* COMMENT */,
  "item()": 59 /* ITEM */,
  "function(*)": 60 /* FUNCTION */,
  "map(*)": 61 /* MAP */,
  "array(*)": 62 /* ARRAY */
};
function valueTypeToString(input) {
  return typeToStringMap[input];
}
function sequenceTypeToString(input) {
  if (input.mult === 2 /* ZERO_OR_MORE */) {
    return valueTypeToString(input.type) + "*";
  }
  if (input.mult === 1 /* ONE_OR_MORE */) {
    return valueTypeToString(input.type) + "+";
  }
  if (input.mult === 0 /* ZERO_OR_ONE */) {
    return valueTypeToString(input.type) + "?";
  }
  return valueTypeToString(input.type);
}
function stringToValueType(input) {
  if (input === "none") {
    throw new Error(`XPST0051: The type "none" could not be found`);
  }
  if (!input.startsWith("xs:") && input.indexOf(":") >= 0) {
    throw new Error(`XPST0081: Invalid prefix for input ${input}`);
  }
  const type = stringToValueTypeMap[input];
  if (type === void 0) {
    throw new Error(`XPST0051: The type "${input}" could not be found`);
  }
  return type;
}
function stringToSequenceType(input) {
  switch (input[input.length - 1]) {
    case "*":
      return {
        type: stringToValueType(input.substr(0, input.length - 1)),
        mult: 2 /* ZERO_OR_MORE */
      };
    case "?":
      return {
        type: stringToValueType(input.substr(0, input.length - 1)),
        mult: 0 /* ZERO_OR_ONE */
      };
    case "+":
      return {
        type: stringToValueType(input.substr(0, input.length - 1)),
        mult: 1 /* ONE_OR_MORE */
      };
    default:
      return {
        type: stringToValueType(input),
        mult: 3 /* EXACTLY_ONE */
      };
  }
}
function stringToSequenceMultiplicity(input) {
  switch (input) {
    case "*":
      return 2 /* ZERO_OR_MORE */;
    case "?":
      return 0 /* ZERO_OR_ONE */;
    case "+":
      return 1 /* ONE_OR_MORE */;
    default:
      return 3 /* EXACTLY_ONE */;
  }
}

// ../gh/fontoxpath/src/expressions/dataTypes/facets/comparators/decimalComparator.ts
function padFraction(fractionString, maxLength) {
  return fractionString.padEnd(maxLength, "0");
}
function decimalComparator(value1, value2) {
  if ((value1 === "0" || value1 === "-0") && (value2 === "0" || value2 === "-0")) {
    return 0;
  }
  const regex2 = /(?:\+|(-))?(\d+)?(?:\.(\d+))?/;
  const match1 = regex2.exec(value1 + "");
  const match2 = regex2.exec(value2 + "");
  const positive1 = !match1[1];
  const positive2 = !match2[1];
  const val1 = (match1[2] || "").replace(/^0*/, "");
  const val2 = (match2[2] || "").replace(/^0*/, "");
  const fraction1 = match1[3] || "";
  const fraction2 = match2[3] || "";
  if (positive1 && !positive2) {
    return 1;
  }
  if (!positive1 && positive2) {
    return -1;
  }
  const bothPositive = positive1 && positive2;
  if (val1.length > val2.length) {
    return bothPositive ? 1 : -1;
  }
  if (val1.length < val2.length) {
    return bothPositive ? -1 : 1;
  }
  if (val1 > val2) {
    return bothPositive ? 1 : -1;
  }
  if (val1 < val2) {
    return bothPositive ? -1 : 1;
  }
  const maxLengthFractions = Math.max(fraction1.length, fraction2.length);
  const paddedFraction1 = padFraction(fraction1, maxLengthFractions);
  const paddedFraction2 = padFraction(fraction2, maxLengthFractions);
  if (paddedFraction1 > paddedFraction2) {
    return bothPositive ? 1 : -1;
  }
  if (paddedFraction1 < paddedFraction2) {
    return bothPositive ? -1 : 1;
  }
  return 0;
}

// ../gh/fontoxpath/src/expressions/dataTypes/facets/facetsByDataType.ts
function validateFractionDigits(value, fractionDigits) {
  const stringValue = value.toString();
  if (stringValue.indexOf(".") > -1 && fractionDigits === 0) {
    return false;
  }
  const regex2 = /^[-+]?0*([1-9]\d*)?(?:\.((?:\d*[1-9])*)0*)?$/;
  const match = regex2.exec(stringValue);
  if (!match[2]) {
    return true;
  }
  return match[2].length <= fractionDigits;
}
function createMaxInclusiveFacet(comperator) {
  return function validateMaxInclusive(value, maxInclusive) {
    return comperator(value, maxInclusive) < 1;
  };
}
function createMaxExclusiveFacet(comperator) {
  return function validateMaxExclusive(value, maxExclusive) {
    return comperator(value, maxExclusive) < 0;
  };
}
function createMinInclusiveFacet(comperator) {
  return function validateMinInclusive(value, minInclusive) {
    return comperator(value, minInclusive) > -1;
  };
}
function createMinExclusiveFacet(comperator) {
  return function validateMinExclusive(value, minExclusive) {
    return comperator(value, minExclusive) > 0;
  };
}
function validateExplicitTimeZone(value, option) {
  switch (option) {
    case "required":
      return /(Z)|([+-])([01]\d):([0-5]\d)$/.test(value.toString());
    case "prohibited":
      return !/(Z)|([+-])([01]\d):([0-5]\d)$/.test(value.toString());
    case "optional":
      return true;
  }
}
function getFacetByDataType(type) {
  switch (type) {
    case 1 /* XSSTRING */:
    case 0 /* XSBOOLEAN */:
    case 6 /* XSFLOAT */:
    case 3 /* XSDOUBLE */:
      return {};
    case 4 /* XSDECIMAL */:
      return {
        fractionDigits: validateFractionDigits,
        maxInclusive: createMaxInclusiveFacet(decimalComparator),
        maxExclusive: createMaxExclusiveFacet(decimalComparator),
        minInclusive: createMinInclusiveFacet(decimalComparator),
        minExclusive: createMinExclusiveFacet(decimalComparator)
      };
    case 18 /* XSDURATION */:
      return {};
    case 9 /* XSDATETIME */:
    case 8 /* XSTIME */:
    case 7 /* XSDATE */:
    case 11 /* XSGYEARMONTH */:
    case 12 /* XSGYEAR */:
    case 13 /* XSGMONTHDAY */:
    case 15 /* XSGDAY */:
    case 14 /* XSGMONTH */:
      return { explicitTimezone: validateExplicitTimeZone };
    case 22 /* XSHEXBINARY */:
    case 21 /* XSBASE64BINARY */:
    case 20 /* XSANYURI */:
    case 23 /* XSQNAME */:
    case 44 /* XSNOTATION */:
      return {};
    default:
      return null;
  }
}
var facetsByDataType_default = {
  getFacetByDataType,
  list: {},
  union: {}
};

// ../gh/fontoxpath/src/expressions/dataTypes/builtins/builtinModels.ts
var builtinModels = [
  {
    variety: 0 /* PRIMITIVE */,
    name: 59 /* ITEM */
  },
  // anyAtomicType
  {
    variety: 0 /* PRIMITIVE */,
    name: 46 /* XSANYATOMICTYPE */,
    parent: 59 /* ITEM */,
    restrictions: {
      whiteSpace: "preserve"
    }
  },
  // untypedAtomic
  {
    variety: 0 /* PRIMITIVE */,
    name: 19 /* XSUNTYPEDATOMIC */,
    parent: 46 /* XSANYATOMICTYPE */
  },
  // string
  {
    variety: 0 /* PRIMITIVE */,
    name: 1 /* XSSTRING */,
    parent: 46 /* XSANYATOMICTYPE */
  },
  // boolean
  {
    variety: 0 /* PRIMITIVE */,
    name: 0 /* XSBOOLEAN */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // decimal
  {
    variety: 0 /* PRIMITIVE */,
    name: 4 /* XSDECIMAL */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // float
  {
    variety: 0 /* PRIMITIVE */,
    name: 6 /* XSFLOAT */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // double
  {
    variety: 0 /* PRIMITIVE */,
    name: 3 /* XSDOUBLE */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // duration
  {
    variety: 0 /* PRIMITIVE */,
    name: 18 /* XSDURATION */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // dateTime
  {
    variety: 0 /* PRIMITIVE */,
    name: 9 /* XSDATETIME */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      explicitTimezone: "optional",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // time
  {
    variety: 0 /* PRIMITIVE */,
    name: 8 /* XSTIME */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      explicitTimezone: "optional",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // date
  {
    variety: 0 /* PRIMITIVE */,
    name: 7 /* XSDATE */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      explicitTimezone: "optional",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // gYearMonth
  {
    variety: 0 /* PRIMITIVE */,
    name: 11 /* XSGYEARMONTH */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      explicitTimezone: "optional",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // gYear
  {
    variety: 0 /* PRIMITIVE */,
    name: 12 /* XSGYEAR */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      explicitTimezone: "optional",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // gMonthDay
  {
    variety: 0 /* PRIMITIVE */,
    name: 13 /* XSGMONTHDAY */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      explicitTimezone: "optional",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // gDay
  {
    variety: 0 /* PRIMITIVE */,
    name: 15 /* XSGDAY */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      explicitTimezone: "optional",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // gMonth
  {
    variety: 0 /* PRIMITIVE */,
    name: 14 /* XSGMONTH */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      explicitTimezone: "optional",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // hexBinary
  {
    variety: 0 /* PRIMITIVE */,
    name: 22 /* XSHEXBINARY */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // base64Binary
  {
    variety: 0 /* PRIMITIVE */,
    name: 21 /* XSBASE64BINARY */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // anyURI
  {
    variety: 0 /* PRIMITIVE */,
    name: 20 /* XSANYURI */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // QName
  {
    variety: 0 /* PRIMITIVE */,
    name: 23 /* XSQNAME */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // NOTATION
  {
    variety: 0 /* PRIMITIVE */,
    name: 44 /* XSNOTATION */,
    parent: 46 /* XSANYATOMICTYPE */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // dateTimeStamp
  {
    variety: 1 /* DERIVED */,
    name: 10 /* XSDATETIMESTAMP */,
    base: 9 /* XSDATETIME */,
    restrictions: {
      whiteSpace: "collapse",
      // fixed
      explicitTimezone: "required"
      // fixed
    }
  },
  // normalizedString
  {
    variety: 1 /* DERIVED */,
    name: 48 /* XSNORMALIZEDSTRING */,
    base: 1 /* XSSTRING */,
    restrictions: {
      whiteSpace: "replace"
    }
  },
  // token
  {
    variety: 1 /* DERIVED */,
    name: 52 /* XSTOKEN */,
    base: 48 /* XSNORMALIZEDSTRING */,
    restrictions: {
      whiteSpace: "collapse"
    }
  },
  // language (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 51 /* XSLANGUAGE */,
    base: 52 /* XSTOKEN */,
    restrictions: {
      whiteSpace: "collapse"
    }
  },
  // NMTOKEN (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 50 /* XSNMTOKEN */,
    base: 52 /* XSTOKEN */,
    restrictions: {
      whiteSpace: "collapse"
    }
  },
  // NMTOKENS
  {
    variety: 2 /* LIST */,
    name: 49 /* XSNMTOKENS */,
    type: 50 /* XSNMTOKEN */,
    restrictions: {
      minLength: 1,
      whiteSpace: "collapse"
    }
  },
  // Name (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 25 /* XSNAME */,
    base: 52 /* XSTOKEN */,
    restrictions: {
      whiteSpace: "collapse"
    }
  },
  // NCName (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 24 /* XSNCNAME */,
    base: 25 /* XSNAME */,
    restrictions: {
      whiteSpace: "collapse"
    }
  },
  // ID (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 42 /* XSID */,
    base: 24 /* XSNCNAME */,
    restrictions: {
      whiteSpace: "collapse"
    }
  },
  // IDREF (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 41 /* XSIDREF */,
    base: 24 /* XSNCNAME */,
    restrictions: {
      whiteSpace: "collapse"
    }
  },
  // IDREFS
  {
    variety: 2 /* LIST */,
    name: 43 /* XSIDREFS */,
    type: 41 /* XSIDREF */,
    restrictions: {
      minLength: 1,
      whiteSpace: "collapse"
    }
  },
  // ENTITY (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 26 /* XSENTITY */,
    base: 24 /* XSNCNAME */,
    restrictions: {
      whiteSpace: "collapse"
    }
  },
  // ENTITIES
  {
    variety: 2 /* LIST */,
    name: 40 /* XSENTITIES */,
    type: 26 /* XSENTITY */,
    restrictions: {
      minLength: 1,
      whiteSpace: "collapse"
    }
  },
  // integer (TODO: implement pattern)
  {
    variety: 0 /* PRIMITIVE */,
    name: 5 /* XSINTEGER */,
    parent: 4 /* XSDECIMAL */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      whiteSpace: "collapse"
      // fixed
    }
  },
  // nonPositiveInteger (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 27 /* XSNONPOSITIVEINTEGER */,
    base: 5 /* XSINTEGER */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      maxInclusive: "0",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // negativeInteger (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 28 /* XSNEGATIVEINTEGER */,
    base: 27 /* XSNONPOSITIVEINTEGER */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      maxInclusive: "-1",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // long (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 31 /* XSLONG */,
    base: 5 /* XSINTEGER */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      maxInclusive: "9223372036854775807",
      minInclusive: "-9223372036854775808",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // int (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 32 /* XSINT */,
    base: 31 /* XSLONG */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      maxInclusive: "2147483647",
      minInclusive: "-2147483648",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // short (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 33 /* XSSHORT */,
    base: 32 /* XSINT */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      maxInclusive: "32767",
      minInclusive: "-32768",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // byte (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 34 /* XSBYTE */,
    base: 33 /* XSSHORT */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      maxInclusive: "127",
      minInclusive: "-128",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // nonNegativeInteger (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 30 /* XSNONNEGATIVEINTEGER */,
    base: 5 /* XSINTEGER */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      minInclusive: "0",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // unsignedLong (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 36 /* XSUNSIGNEDLONG */,
    base: 30 /* XSNONNEGATIVEINTEGER */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      maxInclusive: "18446744073709551615",
      minInclusive: "0",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // unsignedInt (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 35 /* XSUNSIGNEDINT */,
    base: 36 /* XSUNSIGNEDLONG */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      maxInclusive: "4294967295",
      minInclusive: "0",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // unsignedShort (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 38 /* XSUNSIGNEDSHORT */,
    base: 35 /* XSUNSIGNEDINT */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      maxInclusive: "65535",
      minInclusive: "0",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // unsignedByte (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 37 /* XSUNSIGNEDBYTE */,
    base: 38 /* XSUNSIGNEDSHORT */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      maxInclusive: "255",
      minInclusive: "0",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // positiveInteger (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 29 /* XSPOSITIVEINTEGER */,
    base: 30 /* XSNONNEGATIVEINTEGER */,
    restrictions: {
      fractionDigits: 0,
      // fixed
      minInclusive: "1",
      whiteSpace: "collapse"
      // fixed
    }
  },
  // yearMonthDuration (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 16 /* XSYEARMONTHDURATION */,
    base: 18 /* XSDURATION */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  // dayTimeDuration (TODO: implement pattern)
  {
    variety: 1 /* DERIVED */,
    name: 17 /* XSDAYTIMEDURATION */,
    base: 18 /* XSDURATION */,
    restrictions: {
      whiteSpace: "collapse"
      // fixed
    }
  },
  {
    variety: 1 /* DERIVED */,
    name: 60 /* FUNCTION */,
    base: 59 /* ITEM */
  },
  {
    variety: 3 /* UNION */,
    name: 39 /* XSERROR */,
    memberTypes: []
  },
  {
    variety: 1 /* DERIVED */,
    name: 61 /* MAP */,
    base: 60 /* FUNCTION */
  },
  {
    variety: 1 /* DERIVED */,
    name: 62 /* ARRAY */,
    base: 60 /* FUNCTION */
  },
  {
    variety: 0 /* PRIMITIVE */,
    name: 53 /* NODE */,
    parent: 59 /* ITEM */
  },
  {
    variety: 1 /* DERIVED */,
    name: 54 /* ELEMENT */,
    base: 53 /* NODE */
  },
  {
    variety: 1 /* DERIVED */,
    name: 58 /* COMMENT */,
    base: 53 /* NODE */
  },
  {
    variety: 1 /* DERIVED */,
    name: 47 /* ATTRIBUTE */,
    base: 53 /* NODE */
  },
  {
    variety: 1 /* DERIVED */,
    name: 56 /* TEXT */,
    base: 53 /* NODE */
  },
  {
    variety: 1 /* DERIVED */,
    name: 57 /* PROCESSINGINSTRUCTION */,
    base: 53 /* NODE */
  },
  {
    variety: 1 /* DERIVED */,
    name: 55 /* DOCUMENTNODE */,
    base: 53 /* NODE */
  },
  {
    variety: 3 /* UNION */,
    name: 2 /* XSNUMERIC */,
    memberTypes: [
      4 /* XSDECIMAL */,
      5 /* XSINTEGER */,
      6 /* XSFLOAT */,
      3 /* XSDOUBLE */
    ]
  },
  {
    variety: 3 /* UNION */,
    name: 63 /* NONE */,
    memberTypes: []
  }
];
var builtinModels_default = builtinModels;

// ../gh/fontoxpath/src/expressions/dataTypes/builtins/dataTypeValidatorByType.ts
function isValidAnySimpleType(_value) {
  return true;
}
function isValidAnyAtomicType(_value) {
  return true;
}
function isValidString(_value) {
  return true;
}
function isValidBoolean(value) {
  return /^(0|1|true|false)$/.test(value);
}
function isValidFloat(value) {
  return isValidDouble(value);
}
function isValidDouble(value) {
  return /^([+-]?(\d*(\.\d*)?([eE][+-]?\d*)?|INF)|NaN)$/.test(value);
}
function isValidDecimal(value) {
  return /^[+-]?\d*(\.\d*)?$/.test(value);
}
function isValidDuration(value) {
  return /^(-)?P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(\.\d*)?S)?)?$/.test(value);
}
function isValidDateTime(value) {
  return /^-?([1-9][0-9]{3,}|0[0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T(([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]+)?|(24:00:00(\.0+)?))(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?$/.test(
    value
  );
}
function isValidTime(value) {
  return /^(([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]+)?|(24:00:00(\.0+)?))(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?$/.test(
    value
  );
}
function isValidDate(value) {
  return /^-?([1-9][0-9]{3,}|0[0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?$/.test(
    value
  );
}
function isValidGYearMonth(value) {
  return /^-?([1-9][0-9]{3,}|0[0-9]{3})-(0[1-9]|1[0-2])(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?$/.test(
    value
  );
}
function isValidGYear(value) {
  return /^-?([1-9][0-9]{3,}|0[0-9]{3})(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?$/.test(
    value
  );
}
function isValidGMonthDay(value) {
  return /^--(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?$/.test(
    value
  );
}
function isValidGDay(value) {
  return /^---(0[1-9]|[12][0-9]|3[01])(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?$/.test(value);
}
function isValidGMonth(value) {
  return /^--(0[1-9]|1[0-2])(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?$/.test(value);
}
function isValidHexBinary(value) {
  return /^([0-9A-Fa-f]{2})*$/.test(value);
}
function isValidBase64Binary(value) {
  const regex2 = new RegExp(
    /^((([A-Za-z0-9+/] ?){4})*((([A-Za-z0-9+/] ?){3}[A-Za-z0-9+/])|(([A-Za-z0-9+/] ?){2}[AEIMQUYcgkosw048] ?=)|(([A-Za-z0-9+/] ?)[AQgw] ?= ?=)))?$/
  );
  return regex2.test(value);
}
function isValidAnyURI(_value) {
  return true;
}
function isValidName(value) {
  return /^[_:A-Za-z][-._:A-Za-z0-9]*$/.test(value);
}
function isValidNCName(value) {
  return isValidName(value) && /^[_A-Za-z]([-._A-Za-z0-9])*$/.test(value);
}
function isValidQName(value) {
  const parts = value.split(":");
  if (parts.length === 1) {
    return isValidNCName(parts[0]);
  }
  if (parts.length !== 2) {
    return false;
  }
  return isValidNCName(parts[0]) && isValidNCName(parts[1]);
}
function isValidNormalizedString(value) {
  return !/[\u0009\u000A\u000D]/.test(value);
}
function isValidToken(value) {
  return isValidNormalizedString(value) && !/^ | {2,}| $/.test(value);
}
function isValidLanguage(value) {
  return /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/.test(value);
}
function isValidNMTOKEN(value) {
  return /^[-._:A-Za-z0-9]+$/.test(value);
}
function isValidID(value) {
  return isValidNCName(value);
}
function isValidENTITY(value) {
  return isValidNCName(value);
}
function isValidInteger(value) {
  return /^[+-]?\d+$/.test(value);
}
function isValidYearMonthDuration(value) {
  return /^-?P[0-9]+(Y([0-9]+M)?|M)$/.test(value);
}
function isValidDayTimeDuration(value) {
  return /^-?P([0-9]+D)?(T([0-9]+H)?([0-9]+M)?([0-9]+(\.[0-9]+)?S)?)?$/.test(value);
}
var validatorToType = /* @__PURE__ */ new Map([
  [45 /* XSANYSIMPLETYPE */, isValidAnySimpleType],
  [46 /* XSANYATOMICTYPE */, isValidAnyAtomicType],
  [1 /* XSSTRING */, isValidString],
  [0 /* XSBOOLEAN */, isValidBoolean],
  [6 /* XSFLOAT */, isValidFloat],
  [3 /* XSDOUBLE */, isValidDouble],
  [4 /* XSDECIMAL */, isValidDecimal],
  [18 /* XSDURATION */, isValidDuration],
  [9 /* XSDATETIME */, isValidDateTime],
  [8 /* XSTIME */, isValidTime],
  [7 /* XSDATE */, isValidDate],
  [11 /* XSGYEARMONTH */, isValidGYearMonth],
  [12 /* XSGYEAR */, isValidGYear],
  [13 /* XSGMONTHDAY */, isValidGMonthDay],
  [15 /* XSGDAY */, isValidGDay],
  [14 /* XSGMONTH */, isValidGMonth],
  [22 /* XSHEXBINARY */, isValidHexBinary],
  [21 /* XSBASE64BINARY */, isValidBase64Binary],
  [20 /* XSANYURI */, isValidAnyURI],
  [44 /* XSNOTATION */, isValidQName],
  [48 /* XSNORMALIZEDSTRING */, isValidNormalizedString],
  [52 /* XSTOKEN */, isValidToken],
  [51 /* XSLANGUAGE */, isValidLanguage],
  [50 /* XSNMTOKEN */, isValidNMTOKEN],
  [25 /* XSNAME */, isValidName],
  [23 /* XSQNAME */, isValidQName],
  [24 /* XSNCNAME */, isValidNCName],
  [42 /* XSID */, isValidID],
  [41 /* XSIDREF */, isValidID],
  [26 /* XSENTITY */, isValidENTITY],
  [5 /* XSINTEGER */, isValidInteger],
  [16 /* XSYEARMONTHDURATION */, isValidYearMonthDuration],
  [17 /* XSDAYTIMEDURATION */, isValidDayTimeDuration]
]);
function getValidatorForType(type) {
  return validatorToType.get(type);
}

// ../gh/fontoxpath/src/expressions/dataTypes/builtins/builtinDataTypesByType.ts
var builtinDataTypesByType = /* @__PURE__ */ Object.create(null);
builtinModels_default.forEach((model) => {
  const name2 = model.name;
  const restrictionsByName = model.restrictions || {};
  switch (model.variety) {
    case 0 /* PRIMITIVE */: {
      const parent = model.parent ? builtinDataTypesByType[model.parent] : null;
      const validator = getValidatorForType(name2) || null;
      const facetHandlers = facetsByDataType_default.getFacetByDataType(name2);
      builtinDataTypesByType[name2] = {
        variety: 0 /* PRIMITIVE */,
        type: name2,
        restrictionsByName,
        parent,
        validator,
        facetHandlers,
        memberTypes: []
      };
      break;
    }
    case 1 /* DERIVED */: {
      const base = builtinDataTypesByType[model.base];
      const validator = getValidatorForType(name2) || null;
      builtinDataTypesByType[name2] = {
        variety: 1 /* DERIVED */,
        type: name2,
        restrictionsByName,
        parent: base,
        validator,
        facetHandlers: base.facetHandlers,
        memberTypes: []
      };
      break;
    }
    case 2 /* LIST */: {
      const type = builtinDataTypesByType[model.type];
      builtinDataTypesByType[name2] = {
        variety: 2 /* LIST */,
        type: name2,
        restrictionsByName,
        parent: type,
        validator: null,
        facetHandlers: facetsByDataType_default.list,
        memberTypes: []
      };
      break;
    }
    case 3 /* UNION */: {
      const memberTypes = model.memberTypes.map(
        (memberTypeRef) => builtinDataTypesByType[memberTypeRef]
      );
      builtinDataTypesByType[name2] = {
        variety: 3 /* UNION */,
        type: name2,
        restrictionsByName,
        parent: null,
        validator: null,
        facetHandlers: facetsByDataType_default.union,
        memberTypes
      };
    }
  }
});
var builtinDataTypesByType_default = builtinDataTypesByType;

// ../gh/fontoxpath/src/expressions/dataTypes/createAtomicValue.ts
function createAtomicValue(value, type) {
  if (!builtinDataTypesByType_default[type]) {
    throw new Error("Unknown type");
  }
  return {
    type,
    value
  };
}
var trueBoolean = createAtomicValue(true, 0 /* XSBOOLEAN */);
var falseBoolean = createAtomicValue(false, 0 /* XSBOOLEAN */);

// ../gh/fontoxpath/src/expressions/functions/FunctionOperationErrors.ts
var errFOAY0001 = () => new Error("FOAY0001: Array index out of bounds");
var errFORG0006 = (message = "A wrong argument type was specified in a function call.") => new Error(`FORG0006: ${message}`);

// ../gh/fontoxpath/src/expressions/util/iterators.ts
var IterationResult = class {
  constructor(done, value) {
    this.done = done;
    this.value = value;
  }
};
var DONE_TOKEN = new IterationResult(true, void 0);
function ready(value) {
  return new IterationResult(false, value);
}

// ../gh/fontoxpath/src/expressions/dataTypes/isSubtypeOf.ts
function isSubtypeOfType(subType, superType) {
  if (superType.variety === 3 /* UNION */) {
    return !!superType.memberTypes.find((memberType) => isSubtypeOfType(subType, memberType));
  }
  while (subType) {
    if (subType.type === superType.type) {
      return true;
    }
    if (subType.variety === 3 /* UNION */) {
      return !!subType.memberTypes.find(
        (memberType) => isSubtypeOf(memberType.type, superType.type)
      );
    }
    subType = subType.parent;
  }
  return false;
}
function isSubtypeOf(baseSubType, baseSuperType) {
  if (baseSubType === baseSuperType) {
    return true;
  }
  const superType = builtinDataTypesByType_default[baseSuperType];
  const subType = builtinDataTypesByType_default[baseSubType];
  return isSubtypeOfType(subType, superType);
}

// ../gh/fontoxpath/src/expressions/dataTypes/Sequences/ArrayBackedSequence.ts
var ArrayBackedSequence = class {
  constructor(_sequenceFactory, _values) {
    this._sequenceFactory = _sequenceFactory;
    this._values = _values;
    let i4 = -1;
    this.value = {
      next: () => {
        i4++;
        if (i4 >= _values.length) {
          return DONE_TOKEN;
        }
        return ready(_values[i4]);
      }
    };
  }
  expandSequence() {
    return this;
  }
  filter(callback) {
    let i4 = -1;
    return this._sequenceFactory.create({
      next: () => {
        i4++;
        while (i4 < this._values.length && !callback(this._values[i4], i4, this)) {
          i4++;
        }
        if (i4 >= this._values.length) {
          return DONE_TOKEN;
        }
        return ready(this._values[i4]);
      }
    });
  }
  first() {
    return this._values[0];
  }
  getAllValues() {
    return this._values;
  }
  getEffectiveBooleanValue() {
    if (isSubtypeOf(this._values[0].type, 53 /* NODE */)) {
      return true;
    }
    throw errFORG0006(
      `Cannot determine the effective boolean value of a sequence with a length higher than one.`
    );
  }
  getLength() {
    return this._values.length;
  }
  isEmpty() {
    return false;
  }
  isSingleton() {
    return false;
  }
  map(callback) {
    let i4 = -1;
    return this._sequenceFactory.create(
      {
        next: () => {
          return ++i4 >= this._values.length ? DONE_TOKEN : ready(callback(this._values[i4], i4, this));
        }
      },
      this._values.length
    );
  }
  mapAll(callback) {
    return callback(this._values);
  }
  switchCases(cases) {
    if (cases.multiple) {
      return cases.multiple(this);
    }
    return cases.default(this);
  }
};

// ../gh/fontoxpath/src/expressions/dataTypes/Sequences/EmptySequence.ts
var EmptySequence = class {
  constructor() {
    this.value = {
      next: () => DONE_TOKEN
    };
  }
  expandSequence() {
    return this;
  }
  filter(_callback) {
    return this;
  }
  first() {
    return null;
  }
  getAllValues() {
    return [];
  }
  getEffectiveBooleanValue() {
    return false;
  }
  getLength() {
    return 0;
  }
  isEmpty() {
    return true;
  }
  isSingleton() {
    return false;
  }
  map(_callback) {
    return this;
  }
  mapAll(callback) {
    return callback([]);
  }
  switchCases(cases) {
    if (cases.empty) {
      return cases.empty(this);
    }
    return cases.default(this);
  }
};

// ../gh/fontoxpath/src/expressions/dataTypes/Sequences/getEffectiveBooleanValue.ts
function getEffectiveBooleanValue(value) {
  const jsValue = value.value;
  if (isSubtypeOf(value.type, 53 /* NODE */)) {
    return true;
  }
  if (isSubtypeOf(value.type, 0 /* XSBOOLEAN */)) {
    return jsValue;
  }
  if (isSubtypeOf(value.type, 1 /* XSSTRING */) || isSubtypeOf(value.type, 20 /* XSANYURI */) || isSubtypeOf(value.type, 19 /* XSUNTYPEDATOMIC */)) {
    return jsValue.length !== 0;
  }
  if (isSubtypeOf(value.type, 2 /* XSNUMERIC */)) {
    return !isNaN(jsValue) && jsValue !== 0;
  }
  throw errFORG0006(
    `Cannot determine the effective boolean value of a value with the type ${valueTypeToString(
      value.type
    )}`
  );
}

// ../gh/fontoxpath/src/expressions/dataTypes/Sequences/IteratorBackedSequence.ts
var IteratorBackedSequence = class {
  constructor(_sequenceFactory, valueIterator, predictedLength = null) {
    this._sequenceFactory = _sequenceFactory;
    this.value = {
      next: (hint) => {
        if (this._length !== null && this._currentPosition >= this._length) {
          return DONE_TOKEN;
        }
        if (this._cachedValues[this._currentPosition] !== void 0) {
          return ready(this._cachedValues[this._currentPosition++]);
        }
        const value = valueIterator.next(hint);
        if (value.done) {
          const length = this._currentPosition;
          this._length = length;
          return value;
        }
        if (this._cacheAllValues || this._currentPosition < 2) {
          this._cachedValues[this._currentPosition] = value.value;
        }
        this._currentPosition++;
        return value;
      }
    };
    this._cacheAllValues = false;
    this._cachedValues = [];
    this._currentPosition = 0;
    this._length = predictedLength;
  }
  expandSequence() {
    return this._sequenceFactory.create(this.getAllValues());
  }
  filter(callback) {
    let i4 = -1;
    const iterator = this.value;
    return this._sequenceFactory.create({
      next: (hint) => {
        i4++;
        let value = iterator.next(hint);
        while (!value.done) {
          if (callback(value.value, i4, this)) {
            return value;
          }
          i4++;
          value = iterator.next(0 /* NONE */);
        }
        return value;
      }
    });
  }
  first() {
    if (this._cachedValues[0] !== void 0) {
      return this._cachedValues[0];
    }
    const iterator = this.value;
    const firstValue = iterator.next(0 /* NONE */);
    this.reset();
    if (firstValue.done) {
      return null;
    }
    return firstValue.value;
  }
  getAllValues() {
    if (this._currentPosition > this._cachedValues.length && this._length !== this._cachedValues.length) {
      throw new Error("Implementation error: Sequence Iterator has progressed.");
    }
    const iterator = this.value;
    this._cacheAllValues = true;
    let val = iterator.next(0 /* NONE */);
    while (!val.done) {
      val = iterator.next(0 /* NONE */);
    }
    return this._cachedValues;
  }
  getEffectiveBooleanValue() {
    const iterator = this.value;
    const oldPosition = this._currentPosition;
    this.reset();
    const it = iterator.next(0 /* NONE */);
    if (it.done) {
      this.reset(oldPosition);
      return false;
    }
    const firstValue = it.value;
    if (isSubtypeOf(firstValue.type, 53 /* NODE */)) {
      this.reset(oldPosition);
      return true;
    }
    const secondValue = iterator.next(0 /* NONE */);
    if (!secondValue.done) {
      throw errFORG0006(
        `Cannot determine the effective boolean value of a sequence with a length higher than one.`
      );
    }
    this.reset(oldPosition);
    return getEffectiveBooleanValue(firstValue);
  }
  getLength(onlyIfCheap = false) {
    if (this._length !== null) {
      return this._length;
    }
    if (onlyIfCheap) {
      return -1;
    }
    const oldPosition = this._currentPosition;
    const length = this.getAllValues().length;
    this.reset(oldPosition);
    return length;
  }
  isEmpty() {
    if (this._length === 0) {
      return true;
    }
    const firstValue = this.first();
    return firstValue === null;
  }
  isSingleton() {
    if (this._length !== null) {
      return this._length === 1;
    }
    const iterator = this.value;
    const oldPosition = this._currentPosition;
    this.reset();
    const it = iterator.next(0 /* NONE */);
    if (it.done) {
      this.reset(oldPosition);
      return false;
    }
    const secondValue = iterator.next(0 /* NONE */);
    this.reset(oldPosition);
    return secondValue.done;
  }
  map(callback) {
    let i4 = 0;
    const iterator = this.value;
    return this._sequenceFactory.create(
      {
        next: (hint) => {
          const value = iterator.next(hint);
          if (value.done) {
            return DONE_TOKEN;
          }
          return ready(callback(value.value, i4++, this));
        }
      },
      this._length
    );
  }
  mapAll(callback, hint) {
    const iterator = this.value;
    let mappedResultsIterator;
    const allResults = [];
    let isFirst = true;
    (function processNextResult() {
      for (let value = iterator.next(isFirst ? 0 /* NONE */ : hint); !value.done; value = iterator.next(hint)) {
        isFirst = false;
        allResults.push(value.value);
      }
      mappedResultsIterator = callback(allResults).value;
    })();
    return this._sequenceFactory.create({
      next: (_hint) => {
        return mappedResultsIterator.next(0 /* NONE */);
      }
    });
  }
  switchCases(cases) {
    let resultIterator = null;
    const setResultIterator = (resultSequence) => {
      resultIterator = resultSequence.value;
      const resultSequenceLength = resultSequence.getLength(true);
      if (resultSequenceLength !== -1) {
        this._length = resultSequenceLength;
      }
    };
    return this._sequenceFactory.create({
      next: (hint) => {
        if (resultIterator) {
          return resultIterator.next(hint);
        }
        const isEmpty = this.isEmpty();
        if (isEmpty) {
          setResultIterator(cases.empty ? cases.empty(this) : cases.default(this));
          return resultIterator.next(hint);
        }
        const isSingleton = this.isSingleton();
        if (isSingleton) {
          setResultIterator(
            cases.singleton ? cases.singleton(this) : cases.default(this)
          );
          return resultIterator.next(hint);
        }
        setResultIterator(cases.multiple ? cases.multiple(this) : cases.default(this));
        return resultIterator.next(hint);
      }
    });
  }
  reset(to = 0) {
    this._currentPosition = to;
  }
};

// ../gh/fontoxpath/src/expressions/dataTypes/Sequences/SingletonSequence.ts
var SingletonSequence = class {
  constructor(_sequenceFactory, _onlyValue) {
    this._sequenceFactory = _sequenceFactory;
    this._onlyValue = _onlyValue;
    let hasPassed = false;
    this.value = {
      next: () => {
        if (hasPassed) {
          return DONE_TOKEN;
        }
        hasPassed = true;
        return ready(_onlyValue);
      }
    };
    this._effectiveBooleanValue = null;
  }
  expandSequence() {
    return this;
  }
  filter(callback) {
    return callback(this._onlyValue, 0, this) ? this : this._sequenceFactory.create();
  }
  first() {
    return this._onlyValue;
  }
  getAllValues() {
    return [this._onlyValue];
  }
  getEffectiveBooleanValue() {
    if (this._effectiveBooleanValue === null) {
      this._effectiveBooleanValue = getEffectiveBooleanValue(this._onlyValue);
    }
    return this._effectiveBooleanValue;
  }
  getLength() {
    return 1;
  }
  isEmpty() {
    return false;
  }
  isSingleton() {
    return true;
  }
  map(callback) {
    return this._sequenceFactory.create(callback(this._onlyValue, 0, this));
  }
  mapAll(callback) {
    return callback([this._onlyValue]);
  }
  switchCases(cases) {
    if (cases.singleton) {
      return cases.singleton(this);
    }
    return cases.default(this);
  }
};

// ../gh/fontoxpath/src/expressions/dataTypes/sequenceFactory.ts
var emptySequence = new EmptySequence();
function create(value = null, predictedLength = null) {
  if (value === null) {
    return emptySequence;
  }
  if (Array.isArray(value)) {
    switch (value.length) {
      case 0:
        return emptySequence;
      case 1:
        return new SingletonSequence(sequenceFactory, value[0]);
      default:
        return new ArrayBackedSequence(sequenceFactory, value);
    }
  }
  if (value.next) {
    return new IteratorBackedSequence(
      sequenceFactory,
      value,
      predictedLength
    );
  }
  return new SingletonSequence(sequenceFactory, value);
}
var sequenceFactory = {
  create,
  singleton: (value) => {
    return new SingletonSequence(sequenceFactory, value);
  },
  empty: () => {
    return create();
  },
  singletonTrueSequence: () => {
    return create(trueBoolean);
  },
  singletonFalseSequence: () => {
    return create(falseBoolean);
  }
};
var sequenceFactory_default = sequenceFactory;

// ../gh/fontoxpath/src/expressions/util/createDoublyIterableSequence.ts
function createDoublyIterableSequence(sequence2) {
  const savedValues = [];
  const backingIterator = sequence2.value;
  return () => {
    let i4 = 0;
    return sequenceFactory_default.create({
      next: (_hint) => {
        if (savedValues[i4] !== void 0) {
          return savedValues[i4++];
        }
        const val = backingIterator.next(0 /* NONE */);
        if (val.done) {
          return val;
        }
        savedValues[i4++] = val;
        return val;
      }
    });
  };
}

// ../gh/fontoxpath/src/expressions/dataTypes/valueTypes/QName.ts
var QName = class {
  /**
   * @param  prefix         The prefix of the QName, empty string if absent
   * @param  namespaceURI   The namespaceURI of the QName, empty string if absent
   * @param  localName      The localName of the QName, contains no colons
   */
  constructor(prefix2, namespaceURI, localName) {
    this.namespaceURI = namespaceURI || null;
    this.prefix = prefix2 || "";
    this.localName = localName;
  }
  buildPrefixedName() {
    return this.prefix ? this.prefix + ":" + this.localName : this.localName;
  }
};
var QName_default = QName;

// ../gh/fontoxpath/src/expressions/dataTypes/FunctionValue.ts
function expandParameterTypeToArity(argumentTypes, arity) {
  let indexOfRest = -1;
  for (let i4 = 0; i4 < argumentTypes.length; i4++) {
    if (argumentTypes[i4] === 4 /* ELLIPSIS */) {
      indexOfRest = i4;
    }
  }
  if (indexOfRest > -1) {
    const replacePart = new Array(arity - (argumentTypes.length - 1)).fill(
      argumentTypes[indexOfRest - 1]
    );
    return argumentTypes.slice(0, indexOfRest).concat(replacePart);
  }
  return argumentTypes;
}
var FunctionValue = class _FunctionValue extends Value {
  constructor({
    argumentTypes,
    arity,
    isAnonymous = false,
    isUpdating = false,
    localName,
    namespaceURI,
    returnType,
    value
  }) {
    super(60 /* FUNCTION */, null);
    this.value = value;
    this.isUpdating = isUpdating;
    this._argumentTypes = expandParameterTypeToArity(argumentTypes, arity);
    this._arity = arity;
    this._isAnonymous = isAnonymous;
    this._localName = localName;
    this._namespaceURI = namespaceURI;
    this._returnType = returnType;
  }
  /**
   * Apply these arguments to curry them into a new function
   */
  applyArguments(appliedArguments) {
    const fn = this.value;
    const argumentSequenceCreators = appliedArguments.map((arg) => {
      if (arg === null) {
        return null;
      }
      return createDoublyIterableSequence(arg);
    });
    function curriedFunction(dynamicContext, executionParameters, staticContext) {
      const newArguments = Array.from(arguments).slice(3);
      const allArguments = argumentSequenceCreators.map((createArgumentSequence) => {
        if (createArgumentSequence === null) {
          return newArguments.shift();
        }
        return createArgumentSequence();
      });
      return fn.apply(
        void 0,
        [dynamicContext, executionParameters, staticContext].concat(allArguments)
      );
    }
    const argumentTypes = appliedArguments.reduce(
      (indices, arg, index) => {
        if (arg === null) {
          indices.push(this._argumentTypes[index]);
        }
        return indices;
      },
      []
    );
    const functionItem = new _FunctionValue({
      argumentTypes,
      arity: argumentTypes.length,
      isAnonymous: true,
      isUpdating: this.isUpdating,
      localName: "boundFunction",
      namespaceURI: this._namespaceURI,
      returnType: this._returnType,
      value: curriedFunction
    });
    return sequenceFactory_default.singleton(functionItem);
  }
  getArgumentTypes() {
    return this._argumentTypes;
  }
  getArity() {
    return this._arity;
  }
  getName() {
    return this._localName;
  }
  getQName() {
    return new QName_default("", this._namespaceURI, this._localName);
  }
  getReturnType() {
    return this._returnType;
  }
  isAnonymous() {
    return this._isAnonymous;
  }
};
var FunctionValue_default = FunctionValue;

// ../gh/fontoxpath/src/expressions/dataTypes/ArrayValue.ts
var ArrayValue = class extends FunctionValue_default {
  constructor(members) {
    super({
      value: (dynamicContext, executionParameters, staticContext, key) => builtInFunctions_arrays_get_default(
        dynamicContext,
        executionParameters,
        staticContext,
        sequenceFactory_default.singleton(this),
        key
      ),
      localName: "get",
      namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
      // argumentTypes: [{ type: { kind: BaseType.XSINTEGER, seqType: SequenceType.EXACTLY_ONE }, isResArgument: false }],
      argumentTypes: [{ type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ }],
      arity: 1,
      returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    });
    this.type = 62 /* ARRAY */;
    this.members = members;
  }
};
var ArrayValue_default = ArrayValue;

// ../gh/fontoxpath/src/expressions/dataTypes/createPointerValue.ts
function getNodeSubType(pointer, domFacade2) {
  switch (domFacade2.getNodeType(pointer)) {
    case 2:
      return 47 /* ATTRIBUTE */;
    case 1:
      return 54 /* ELEMENT */;
    case 3:
    case 4:
      return 56 /* TEXT */;
    case 7:
      return 57 /* PROCESSINGINSTRUCTION */;
    case 8:
      return 58 /* COMMENT */;
    case 9:
      return 55 /* DOCUMENTNODE */;
    default:
      return 53 /* NODE */;
  }
}
function createPointerValue(pointer, domFacade2) {
  const nodeValue = { type: getNodeSubType(pointer, domFacade2), value: pointer };
  return nodeValue;
}

// ../gh/fontoxpath/src/expressions/util/zipSingleton.ts
function zipSingleton(sequences, callback) {
  const firstValues = sequences.map((seq) => seq.first());
  return callback(firstValues);
}

// ../gh/fontoxpath/src/expressions/functions/isSameMapKey.ts
function isSameMapKey(k1, k2) {
  const k1IsStringLike = isSubtypeOf(k1.type, 1 /* XSSTRING */) || isSubtypeOf(k1.type, 20 /* XSANYURI */) || isSubtypeOf(k1.type, 19 /* XSUNTYPEDATOMIC */);
  const k2IsStringLike = isSubtypeOf(k2.type, 1 /* XSSTRING */) || isSubtypeOf(k2.type, 20 /* XSANYURI */) || isSubtypeOf(k2.type, 19 /* XSUNTYPEDATOMIC */);
  if (k1IsStringLike && k2IsStringLike) {
    return k1.value === k2.value;
  }
  const k1IsNumeric = isSubtypeOf(k1.type, 4 /* XSDECIMAL */) || isSubtypeOf(k1.type, 3 /* XSDOUBLE */) || isSubtypeOf(k1.type, 6 /* XSFLOAT */);
  const k2IsNumeric = isSubtypeOf(k2.type, 4 /* XSDECIMAL */) || isSubtypeOf(k2.type, 3 /* XSDOUBLE */) || isSubtypeOf(k2.type, 6 /* XSFLOAT */);
  if (k1IsNumeric && k2IsNumeric) {
    if (isNaN(k1.value) && isNaN(k2.value)) {
      return true;
    }
    return k1.value === k2.value;
  }
  const k1IsOther = isSubtypeOf(k1.type, 0 /* XSBOOLEAN */) || isSubtypeOf(k1.type, 22 /* XSHEXBINARY */) || isSubtypeOf(k1.type, 18 /* XSDURATION */) || isSubtypeOf(k1.type, 23 /* XSQNAME */) || isSubtypeOf(k1.type, 44 /* XSNOTATION */);
  const k2IsOther = isSubtypeOf(k2.type, 0 /* XSBOOLEAN */) || isSubtypeOf(k2.type, 22 /* XSHEXBINARY */) || isSubtypeOf(k2.type, 18 /* XSDURATION */) || isSubtypeOf(k2.type, 23 /* XSQNAME */) || isSubtypeOf(k2.type, 44 /* XSNOTATION */);
  if (k1IsOther && k2IsOther) {
    return k1.value === k2.value;
  }
  return false;
}

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_maps_get.ts
var mapGet = (_dynamicContext, _executionParameters, _staticContext, mapSequence, key) => {
  return zipSingleton([mapSequence, key], ([map, keyValue]) => {
    const matchingPair = map.keyValuePairs.find((keyValuePair) => {
      return isSameMapKey(keyValuePair.key, keyValue);
    });
    if (!matchingPair) {
      return sequenceFactory_default.empty();
    }
    return matchingPair.value();
  });
};
var builtInFunctions_maps_get_default = mapGet;

// ../gh/fontoxpath/src/expressions/dataTypes/MapValue.ts
var MapValue = class extends FunctionValue_default {
  constructor(keyValuePairs) {
    super({
      // argumentTypes: [{ type: 'item()', isRestArgument: false }],
      argumentTypes: [{ type: 59 /* ITEM */, mult: 3 /* EXACTLY_ONE */ }],
      arity: 1,
      localName: "get",
      namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
      value: (dynamicContext, executionParameters, staticContext, key) => builtInFunctions_maps_get_default(
        dynamicContext,
        executionParameters,
        staticContext,
        sequenceFactory_default.singleton(this),
        key
      ),
      returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    });
    this.type = 61 /* MAP */;
    this.keyValuePairs = keyValuePairs;
  }
};
var MapValue_default = MapValue;

// ../gh/fontoxpath/src/expressions/dataTypes/valueTypes/AbstractDuration.ts
var AbstractDuration = class {
  equals(other) {
    return this.getRawMonths() === other.getRawMonths() && this.getRawSeconds() === other.getRawSeconds();
  }
  getDays() {
    return 0;
  }
  getHours() {
    return 0;
  }
  getMinutes() {
    return 0;
  }
  getMonths() {
    return 0;
  }
  getRawMonths() {
    return 0;
  }
  getRawSeconds() {
    return 0;
  }
  getSeconds() {
    return 0;
  }
  getYears() {
    return 0;
  }
  isPositive() {
    return true;
  }
  negate() {
    return this;
  }
};
var AbstractDuration_default = AbstractDuration;

// ../gh/fontoxpath/src/expressions/dataTypes/valueTypes/DayTimeDuration.ts
var DayTimeDuration = class extends AbstractDuration_default {
  constructor(seconds) {
    super();
    if (seconds > Number.MAX_SAFE_INTEGER || seconds < Number.MIN_SAFE_INTEGER) {
      throw new Error(
        "FODT0002: Number of seconds given to construct DayTimeDuration overflows MAX_SAFE_INTEGER or MIN_SAFE_INTEGER"
      );
    }
    this.seconds = seconds;
  }
  getDays() {
    return Math.trunc(this.seconds / 86400);
  }
  getHours() {
    return Math.trunc(this.seconds % 86400 / 3600);
  }
  getMinutes() {
    return Math.trunc(this.seconds % 3600 / 60);
  }
  getRawSeconds() {
    return this.seconds;
  }
  getSeconds() {
    const result = this.seconds % 60;
    return Object.is(-0, result) ? 0 : result;
  }
  isPositive() {
    return Object.is(-0, this.seconds) ? false : this.seconds >= 0;
  }
  negate() {
    return new this.constructor(-this.seconds);
  }
  toString() {
    return (this.isPositive() ? "P" : "-P") + this.toStringWithoutP();
  }
  toStringWithoutP() {
    const days = Math.abs(this.getDays());
    const hours = Math.abs(this.getHours());
    const minutes = Math.abs(this.getMinutes());
    const seconds = Math.abs(this.getSeconds());
    const dayPart = `${days ? `${days}D` : ""}`;
    const timePart = (hours ? `${hours}H` : "") + (minutes ? `${minutes}M` : "") + (seconds ? `${seconds}S` : "");
    if (dayPart && timePart) {
      return `${dayPart}T${timePart}`;
    }
    if (dayPart) {
      return dayPart;
    }
    if (timePart) {
      return `T${timePart}`;
    }
    return "T0S";
  }
};
DayTimeDuration.fromParts = (days, hours, minutes, seconds, secondFraction, isPositive) => {
  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds + secondFraction;
  return new DayTimeDuration(isPositive || totalSeconds === 0 ? totalSeconds : -totalSeconds);
};
DayTimeDuration.fromString = (dayTimeDurationString) => {
  const regex2 = /^(-)?P(\d+Y)?(\d+M)?(\d+D)?(?:T(\d+H)?(\d+M)?(\d+(\.\d*)?S)?)?$/;
  const match = regex2.exec(dayTimeDurationString);
  if (!match) {
    return null;
  }
  const isPositive = !match[1];
  const days = match[4] ? parseInt(match[4], 10) : 0;
  const hours = match[5] ? parseInt(match[5], 10) : 0;
  const minutes = match[6] ? parseInt(match[6], 10) : 0;
  const seconds = match[7] ? parseInt(match[7], 10) : 0;
  const secondFraction = match[8] ? parseFloat(match[8]) : 0;
  return DayTimeDuration.fromParts(days, hours, minutes, seconds, secondFraction, isPositive);
};
DayTimeDuration.fromTimezoneString = (timezoneString) => {
  const regex2 = /^(Z)|([+-])([01]\d):([0-5]\d)$/;
  const match = regex2.exec(timezoneString);
  if (match[1] === "Z") {
    return DayTimeDuration.fromParts(0, 0, 0, 0, 0, true);
  }
  const isPositive = match[2] === "+";
  const hours = match[3] ? parseInt(match[3], 10) : 0;
  const minutes = match[4] ? parseInt(match[4], 10) : 0;
  return DayTimeDuration.fromParts(0, hours, minutes, 0, 0, isPositive);
};
DayTimeDuration.fromJavascriptDateTimezone = (date) => {
  const minutes = date.getTimezoneOffset();
  const isPositive = minutes > -1;
  return DayTimeDuration.fromParts(0, 0, Math.abs(minutes), 0, 0, isPositive);
};
function lessThan(dayTimeDuration1, dayTimeDuration2) {
  return dayTimeDuration1.seconds < dayTimeDuration2.seconds;
}
function greaterThan(dayTimeDuration1, dayTimeDuration2) {
  return dayTimeDuration1.seconds > dayTimeDuration2.seconds;
}
function add(dayTimeDuration1, dayTimeDuration2) {
  return new DayTimeDuration(dayTimeDuration1.seconds + dayTimeDuration2.seconds);
}
function subtract(dayTimeDuration1, dayTimeDuration2) {
  return new DayTimeDuration(dayTimeDuration1.seconds - dayTimeDuration2.seconds);
}
function multiply(dayTimeDuration, double) {
  if (isNaN(double)) {
    throw new Error("FOCA0005: Cannot multiply xs:dayTimeDuration by NaN");
  }
  const result = dayTimeDuration.seconds * double;
  if (result > Number.MAX_SAFE_INTEGER || !Number.isFinite(result)) {
    throw new Error("FODT0002: Value overflow while multiplying xs:dayTimeDuration");
  }
  return new DayTimeDuration(
    result < Number.MIN_SAFE_INTEGER || Object.is(-0, result) ? 0 : result
  );
}
function divide(dayTimeDuration, double) {
  if (isNaN(double)) {
    throw new Error("FOCA0005: Cannot divide xs:dayTimeDuration by NaN");
  }
  const result = dayTimeDuration.seconds / double;
  if (result > Number.MAX_SAFE_INTEGER || !Number.isFinite(result)) {
    throw new Error("FODT0002: Value overflow while dividing xs:dayTimeDuration");
  }
  return new DayTimeDuration(
    result < Number.MIN_SAFE_INTEGER || Object.is(-0, result) ? 0 : result
  );
}
function divideByDayTimeDuration(dayTimeDuration1, dayTimeDuration2) {
  if (dayTimeDuration2.seconds === 0) {
    throw new Error("FOAR0001: Division by 0");
  }
  return dayTimeDuration1.seconds / dayTimeDuration2.seconds;
}
var DayTimeDuration_default = DayTimeDuration;

// ../gh/fontoxpath/src/expressions/dataTypes/valueTypes/DateTime.ts
function parseMatch(match) {
  return match ? parseInt(match, 10) : null;
}
function convertYearToString(year) {
  let yearString = year + "";
  const isNegative = yearString.startsWith("-");
  if (isNegative) {
    yearString = yearString.substring(1);
  }
  return (isNegative ? "-" : "") + yearString.padStart(4, "0");
}
function convertToTwoCharString(value) {
  const valueString = value + "";
  return valueString.padStart(2, "0");
}
function convertSecondsToString(seconds) {
  let secondsString = seconds + "";
  if (secondsString.split(".")[0].length === 1) {
    secondsString = secondsString.padStart(secondsString.length + 1, "0");
  }
  return secondsString;
}
function isUTC(timezone) {
  return timezone.getHours() === 0 && timezone.getMinutes() === 0;
}
function timezoneToString(timezone) {
  if (isUTC(timezone)) {
    return "Z";
  }
  return (timezone.isPositive() ? "+" : "-") + convertToTwoCharString(Math.abs(timezone.getHours())) + ":" + convertToTwoCharString(Math.abs(timezone.getMinutes()));
}
var DateTime = class _DateTime {
  constructor(years, months, days, hours, minutes, seconds, secondFraction, timezone, type = 9 /* XSDATETIME */) {
    this._years = years;
    this._months = months;
    this._days = days + (hours === 24 ? 1 : 0);
    this._hours = hours === 24 ? 0 : hours;
    this._minutes = minutes;
    this._seconds = seconds;
    this.secondFraction = secondFraction;
    this._timezone = timezone;
    this.type = type;
  }
  // dateTime    | (-)yyyy-mm-ddThh:mm:ss.ss(Z|[+-]hh:mm)
  // time        |               hh:mm:ss.ss(Z|[+-]hh:mm)
  // date        | (-)yyyy-mm-dd            (Z|[+-]hh:mm)
  // gYearMonth  | (-)yyyy-mm               (Z|[+-]hh:mm)
  // gYear       | (-)yyyy                  (Z|[+-]hh:mm)
  // gMonthDay   |       --mm-dd            (Z|[+-]hh:mm)
  // gDay        |         ---dd            (Z|[+-]hh:mm)
  // gMonth      |       --mm               (Z|[+-]hh:mm)
  static fromString(dateString) {
    const regex2 = /^(?:(-?\d{4,}))?(?:--?(\d\d))?(?:-{1,3}(\d\d))?(T)?(?:(\d\d):(\d\d):(\d\d))?(\.\d+)?(Z|(?:[+-]\d\d:\d\d))?$/;
    const match = regex2.exec(dateString);
    const years = match[1] ? parseInt(match[1], 10) : null;
    const months = parseMatch(match[2]);
    const days = parseMatch(match[3]);
    const t4 = match[4];
    const hours = parseMatch(match[5]);
    const minutes = parseMatch(match[6]);
    const seconds = parseMatch(match[7]);
    const secondFraction = match[8] ? parseFloat(match[8]) : 0;
    const timezone = match[9] ? DayTimeDuration_default.fromTimezoneString(match[9]) : null;
    if (years && (years < -271821 || years > 273860)) {
      throw new Error("FODT0001: Datetime year is out of bounds");
    }
    if (t4) {
      return new _DateTime(
        years,
        months,
        days,
        hours,
        minutes,
        seconds,
        secondFraction,
        timezone,
        9 /* XSDATETIME */
      );
    }
    if (hours !== null && minutes !== null && seconds !== null) {
      return new _DateTime(
        1972,
        12,
        31,
        hours,
        minutes,
        seconds,
        secondFraction,
        timezone,
        8 /* XSTIME */
      );
    }
    if (years !== null && months !== null && days !== null) {
      return new _DateTime(years, months, days, 0, 0, 0, 0, timezone, 7 /* XSDATE */);
    }
    if (years !== null && months !== null) {
      return new _DateTime(years, months, 1, 0, 0, 0, 0, timezone, 11 /* XSGYEARMONTH */);
    }
    if (months !== null && days !== null) {
      return new _DateTime(1972, months, days, 0, 0, 0, 0, timezone, 13 /* XSGMONTHDAY */);
    }
    if (years !== null) {
      return new _DateTime(years, 1, 1, 0, 0, 0, 0, timezone, 12 /* XSGYEAR */);
    }
    if (months !== null) {
      return new _DateTime(1972, months, 1, 0, 0, 0, 0, timezone, 14 /* XSGMONTH */);
    }
    return new _DateTime(1972, 12, days, 0, 0, 0, 0, timezone, 15 /* XSGDAY */);
  }
  convertToType(type) {
    switch (type) {
      case 15 /* XSGDAY */:
        return new _DateTime(
          1972,
          12,
          this._days,
          0,
          0,
          0,
          0,
          this._timezone,
          15 /* XSGDAY */
        );
      case 14 /* XSGMONTH */:
        return new _DateTime(
          1972,
          this._months,
          1,
          0,
          0,
          0,
          0,
          this._timezone,
          14 /* XSGMONTH */
        );
      case 12 /* XSGYEAR */:
        return new _DateTime(
          this._years,
          1,
          1,
          0,
          0,
          0,
          0,
          this._timezone,
          12 /* XSGYEAR */
        );
      case 13 /* XSGMONTHDAY */:
        return new _DateTime(
          1972,
          this._months,
          this._days,
          0,
          0,
          0,
          0,
          this._timezone,
          13 /* XSGMONTHDAY */
        );
      case 11 /* XSGYEARMONTH */:
        return new _DateTime(
          this._years,
          this._months,
          1,
          0,
          0,
          0,
          0,
          this._timezone,
          11 /* XSGYEARMONTH */
        );
      case 8 /* XSTIME */:
        return new _DateTime(
          1972,
          12,
          31,
          this._hours,
          this._minutes,
          this._seconds,
          this.secondFraction,
          this._timezone,
          8 /* XSTIME */
        );
      case 7 /* XSDATE */:
        return new _DateTime(
          this._years,
          this._months,
          this._days,
          0,
          0,
          0,
          0,
          this._timezone,
          7 /* XSDATE */
        );
      case 9 /* XSDATETIME */:
      default:
        return new _DateTime(
          this._years,
          this._months,
          this._days,
          this._hours,
          this._minutes,
          this._seconds,
          this.secondFraction,
          this._timezone,
          9 /* XSDATETIME */
        );
    }
  }
  getDay() {
    return this._days;
  }
  getFullSeconds() {
    return this._seconds + this.secondFraction;
  }
  getHours() {
    return this._hours;
  }
  getMinutes() {
    return this._minutes;
  }
  getMonth() {
    return this._months;
  }
  getSecondFraction() {
    return this.secondFraction;
  }
  getSeconds() {
    return this._seconds;
  }
  getTimezone() {
    return this._timezone;
  }
  getYear() {
    return this._years;
  }
  isPositive() {
    return this._years >= 0;
  }
  toJavaScriptDate(implicitTimezone) {
    const timezoneToUse = this._timezone || implicitTimezone || DayTimeDuration_default.fromTimezoneString("Z");
    return new Date(
      Date.UTC(
        this._years,
        this._months - 1,
        this._days,
        this._hours - timezoneToUse.getHours(),
        this._minutes - timezoneToUse.getMinutes(),
        this._seconds,
        this.secondFraction * 1e3
      )
    );
  }
  toString() {
    switch (this.type) {
      case 9 /* XSDATETIME */:
        return convertYearToString(this._years) + "-" + convertToTwoCharString(this._months) + "-" + convertToTwoCharString(this._days) + "T" + convertToTwoCharString(this._hours) + ":" + convertToTwoCharString(this._minutes) + ":" + convertSecondsToString(this._seconds + this.secondFraction) + (this._timezone ? timezoneToString(this._timezone) : "");
      case 7 /* XSDATE */:
        return convertYearToString(this._years) + "-" + convertToTwoCharString(this._months) + "-" + convertToTwoCharString(this._days) + (this._timezone ? timezoneToString(this._timezone) : "");
      case 8 /* XSTIME */:
        return convertToTwoCharString(this._hours) + ":" + convertToTwoCharString(this._minutes) + ":" + convertSecondsToString(this._seconds + this.secondFraction) + (this._timezone ? timezoneToString(this._timezone) : "");
      case 15 /* XSGDAY */:
        return "---" + convertToTwoCharString(this._days) + (this._timezone ? timezoneToString(this._timezone) : "");
      case 14 /* XSGMONTH */:
        return "--" + convertToTwoCharString(this._months) + (this._timezone ? timezoneToString(this._timezone) : "");
      case 13 /* XSGMONTHDAY */:
        return "--" + convertToTwoCharString(this._months) + "-" + convertToTwoCharString(this._days) + (this._timezone ? timezoneToString(this._timezone) : "");
      case 12 /* XSGYEAR */:
        return convertYearToString(this._years) + (this._timezone ? timezoneToString(this._timezone) : "");
      case 11 /* XSGYEARMONTH */:
        return convertYearToString(this._years) + "-" + convertToTwoCharString(this._months) + (this._timezone ? timezoneToString(this._timezone) : "");
    }
    throw new Error("Unexpected subType");
  }
};
function compare(dateTime1, dateTime2, implicitTimezone) {
  const jsTime1 = dateTime1.toJavaScriptDate(implicitTimezone).getTime();
  const jsTime2 = dateTime2.toJavaScriptDate(implicitTimezone).getTime();
  if (jsTime1 === jsTime2) {
    if (dateTime1.secondFraction === dateTime2.secondFraction) {
      return 0;
    }
    if (dateTime1.secondFraction > dateTime2.secondFraction) {
      return 1;
    }
    return -1;
  }
  if (jsTime1 > jsTime2) {
    return 1;
  }
  return -1;
}
function equal(dateTime1, dateTime2, implicitTimezone) {
  return compare(dateTime1, dateTime2, implicitTimezone) === 0;
}
function lessThan2(dateTime1, dateTime2, implicitTimezone) {
  return compare(dateTime1, dateTime2, implicitTimezone) < 0;
}
function greaterThan2(dateTime1, dateTime2, implicitTimezone) {
  return compare(dateTime1, dateTime2, implicitTimezone) > 0;
}
function subtract2(dateTime1, dateTime2, implicitTimezone) {
  const secondsOfDuration = (dateTime1.toJavaScriptDate(implicitTimezone).getTime() - dateTime2.toJavaScriptDate(implicitTimezone).getTime()) / 1e3;
  return new DayTimeDuration_default(secondsOfDuration);
}
function evalDuration(dateTime, duration) {
  const tz = dateTime.getTimezone();
  let years = dateTime.getYear();
  let months = dateTime.getMonth();
  let days = dateTime.getDay();
  let hours = dateTime.getHours();
  let minutes = dateTime.getMinutes();
  let seconds = dateTime.getSeconds();
  const fraction = dateTime.getSecondFraction();
  years += duration.getYears();
  months += duration.getMonths();
  while (months > 12) {
    months -= 12;
    years += 1;
  }
  while (months < 1) {
    months += 12;
    years -= 1;
  }
  function isLeapYear(year) {
    return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
  }
  function getLastDayOfMonth(year, month) {
    if (month === 2) {
      return isLeapYear(year) ? 29 : 28;
    }
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
  }
  const originalLastDay = getLastDayOfMonth(dateTime.getYear(), dateTime.getMonth());
  const originalWasLastDay = dateTime.getDay() === originalLastDay;
  const newLastDay = getLastDayOfMonth(years, months);
  if (originalWasLastDay) {
    days = newLastDay;
  }
  days += duration.getDays();
  hours += duration.getHours();
  minutes += duration.getMinutes();
  seconds += duration.getSeconds();
  if (seconds >= 60) {
    minutes += Math.floor(seconds / 60);
    seconds = seconds % 60;
  } else if (seconds < 0) {
    minutes -= Math.ceil(Math.abs(seconds) / 60);
    seconds = (seconds % 60 + 60) % 60;
  }
  if (minutes >= 60) {
    hours += Math.floor(minutes / 60);
    minutes = minutes % 60;
  } else if (minutes < 0) {
    hours -= Math.ceil(Math.abs(minutes) / 60);
    minutes = (minutes % 60 + 60) % 60;
  }
  if (hours >= 24) {
    days += Math.floor(hours / 24);
    hours = hours % 24;
  } else if (hours < 0) {
    days -= Math.ceil(Math.abs(hours) / 24);
    hours = (hours % 24 + 24) % 24;
  }
  while (days > getLastDayOfMonth(years, months)) {
    days -= getLastDayOfMonth(years, months);
    months += 1;
  }
  while (days < 1) {
    months -= 1;
    days += getLastDayOfMonth(years, months);
  }
  while (months > 12) {
    months -= 12;
    years += 1;
  }
  while (months < 1) {
    months += 12;
    years -= 1;
  }
  return new DateTime(years, months, days, hours, minutes, seconds, fraction, tz, dateTime.type);
}
function addDuration(dateTime, duration) {
  return evalDuration(dateTime, duration);
}
function subtractDuration(dateTime, duration) {
  return evalDuration(dateTime, duration.negate());
}
var DateTime_default = DateTime;

// ../gh/fontoxpath/src/expressions/adaptJavaScriptValueToXPathValue.ts
function adaptSingleJavaScriptValue(value, domFacade2) {
  if (value === null) {
    return null;
  }
  switch (typeof value) {
    case "boolean":
      return value ? trueBoolean : falseBoolean;
    case "number":
      return createAtomicValue(value, 3 /* XSDOUBLE */);
    case "string":
      return createAtomicValue(value, 1 /* XSSTRING */);
    case "object":
      if ("nodeType" in value) {
        const pointer = {
          node: value,
          graftAncestor: null
        };
        return createPointerValue(pointer, domFacade2);
      }
      if (Array.isArray(value)) {
        return new ArrayValue_default(
          value.map((arrayItem) => {
            if (arrayItem === void 0) {
              return () => sequenceFactory_default.empty();
            }
            const adaptedValue = adaptSingleJavaScriptValue(arrayItem, domFacade2);
            const adaptedSequence = adaptedValue === null ? sequenceFactory_default.empty() : sequenceFactory_default.singleton(adaptedValue);
            return createDoublyIterableSequence(adaptedSequence);
          })
        );
      }
      if (value instanceof Date) {
        const date = DateTime_default.fromString(value.toISOString());
        return createAtomicValue(date, date.type);
      }
      const mapValue = value;
      return new MapValue_default(
        Object.keys(mapValue).filter((key) => mapValue[key] !== void 0).map((key) => {
          const adaptedValue = adaptSingleJavaScriptValue(mapValue[key], domFacade2);
          const adaptedSequence = adaptedValue === null ? sequenceFactory_default.empty() : sequenceFactory_default.singleton(adaptedValue);
          return {
            key: createAtomicValue(key, 1 /* XSSTRING */),
            value: createDoublyIterableSequence(adaptedSequence)
          };
        })
      );
  }
  throw new Error(
    `Value ${String(value)} of type "${typeof value}" is not adaptable to an XPath value.`
  );
}
function checkNumericType(value, type) {
  if (typeof value === "number") {
    return;
  }
  if (typeof value === "string") {
    const validator = getValidatorForType(type);
    if (validator(value)) {
      return;
    }
  }
  throw new Error(
    `Cannot convert JavaScript value '${value}' to the XPath type ${valueTypeToString(
      type
    )} since it is not valid.`
  );
}
function adaptJavaScriptValueToXPath(type, value, domFacade2) {
  if (value === null) {
    return null;
  }
  switch (type) {
    case 0 /* XSBOOLEAN */:
      return value ? trueBoolean : falseBoolean;
    case 1 /* XSSTRING */:
      return createAtomicValue(value + "", 1 /* XSSTRING */);
    case 3 /* XSDOUBLE */:
    case 2 /* XSNUMERIC */:
      checkNumericType(value, 3 /* XSDOUBLE */);
      return createAtomicValue(+value, 3 /* XSDOUBLE */);
    case 4 /* XSDECIMAL */:
      checkNumericType(value, type);
      return createAtomicValue(+value, 4 /* XSDECIMAL */);
    case 5 /* XSINTEGER */:
      checkNumericType(value, type);
      return createAtomicValue(value | 0, 5 /* XSINTEGER */);
    case 6 /* XSFLOAT */:
      checkNumericType(value, type);
      return createAtomicValue(+value, 6 /* XSFLOAT */);
    case 7 /* XSDATE */:
    case 8 /* XSTIME */:
    case 9 /* XSDATETIME */:
    case 11 /* XSGYEARMONTH */:
    case 12 /* XSGYEAR */:
    case 13 /* XSGMONTHDAY */:
    case 14 /* XSGMONTH */:
    case 15 /* XSGDAY */:
      if (!(value instanceof Date)) {
        throw new Error(
          `The JavaScript value ${value} with type ${typeof value} is not a valid type to be converted to an XPath ${valueTypeToString(
            type
          )}.`
        );
      }
      return createAtomicValue(
        DateTime_default.fromString(value.toISOString()).convertToType(type),
        type
      );
    case 53 /* NODE */:
    case 47 /* ATTRIBUTE */:
    case 55 /* DOCUMENTNODE */:
    case 54 /* ELEMENT */:
    case 56 /* TEXT */:
    case 57 /* PROCESSINGINSTRUCTION */:
    case 58 /* COMMENT */:
      if (!(typeof value === "object") || !("nodeType" in value)) {
        throw new Error(
          `The JavaScript value ${value} with type ${typeof value} is not a valid type to be converted to an XPath ${valueTypeToString(
            type
          )}.`
        );
      }
      const pointer = {
        node: value,
        graftAncestor: null
      };
      return createPointerValue(pointer, domFacade2);
    case 59 /* ITEM */:
      return adaptSingleJavaScriptValue(value, domFacade2);
    case 61 /* MAP */:
      return adaptSingleJavaScriptValue(value, domFacade2);
    default:
      throw new Error(
        `Values of the type "${valueTypeToString(
          type
        )}" can not be adapted from JavaScript to equivalent XPath values.`
      );
  }
}
function adaptJavaScriptValueToArrayOfXPathValues(domFacade2, value, expectedType) {
  if (expectedType.mult === 0 /* ZERO_OR_ONE */) {
    const converted = adaptJavaScriptValueToXPath(expectedType.type, value, domFacade2);
    return converted === null ? [] : [converted];
  }
  if (expectedType.mult === 2 /* ZERO_OR_MORE */ || expectedType.mult === 1 /* ONE_OR_MORE */) {
    if (!Array.isArray(value)) {
      throw new Error(
        `The JavaScript value ${value} should be an array if it is to be converted to ${sequenceTypeToString(
          expectedType
        )}.`
      );
    }
    return value.map((val) => adaptJavaScriptValueToXPath(expectedType.type, val, domFacade2)).filter((val) => val !== null);
  }
  const adaptedValue = adaptJavaScriptValueToXPath(expectedType.type, value, domFacade2);
  if (adaptedValue === null) {
    throw new Error(
      `The JavaScript value ${value} should be a single entry if it is to be converted to ${sequenceTypeToString(
        expectedType
      )}.`
    );
  }
  return [adaptedValue];
}
function adaptJavaScriptValueToSequence(domFacade2, value, expectedType = { type: 59 /* ITEM */, mult: 0 /* ZERO_OR_ONE */ }) {
  return sequenceFactory_default.create(
    adaptJavaScriptValueToArrayOfXPathValues(domFacade2, value, expectedType)
  );
}

// ../gh/fontoxpath/src/expressions/util/Random.ts
var _Random = class _Random {
  constructor(seed = Math.floor(Math.random() * _Random._m)) {
    this._defaultSeed = Math.abs(seed % _Random._m);
  }
  getRandomNumber(seed) {
    const current = (_Random._a * (seed ?? this._defaultSeed) + _Random._c) % _Random._m;
    return {
      currentInt: Math.floor(current),
      currentDecimal: current / _Random._m
    };
  }
};
_Random._a = 29421;
_Random._c = 0;
_Random._m = 2 ** 32;
var Random = _Random;

// ../gh/fontoxpath/src/expressions/DynamicContext.ts
var DynamicContext = class _DynamicContext {
  constructor(context, temporalContext = {
    currentDateTime: null,
    implicitTimezone: null,
    isInitialized: false
  }, random = new Random()) {
    this._temporalContext = temporalContext;
    this.contextItemIndex = context.contextItemIndex;
    this.contextSequence = context.contextSequence;
    this.contextItem = context.contextItem;
    this.variableBindings = context.variableBindings || /* @__PURE__ */ Object.create(null);
    this._random = random;
  }
  createSequenceIterator(contextSequence) {
    let i4 = 0;
    const iterator = contextSequence.value;
    return {
      next: (hint) => {
        const value = iterator.next(hint);
        if (value.done) {
          return DONE_TOKEN;
        }
        return ready(this.scopeWithFocus(i4++, value.value, contextSequence));
      }
    };
  }
  getCurrentDateTime() {
    if (!this._temporalContext.isInitialized) {
      this._temporalContext.isInitialized = true;
      this._temporalContext.currentDateTime = DateTime_default.fromString((/* @__PURE__ */ new Date()).toISOString());
      this._temporalContext.implicitTimezone = DayTimeDuration_default.fromString("PT0S");
    }
    return this._temporalContext.currentDateTime;
  }
  getImplicitTimezone() {
    if (!this._temporalContext.isInitialized) {
      this._temporalContext.isInitialized = true;
      this._temporalContext.currentDateTime = DateTime_default.fromString((/* @__PURE__ */ new Date()).toISOString());
      this._temporalContext.implicitTimezone = DayTimeDuration_default.fromString("PT0S");
    }
    return this._temporalContext.implicitTimezone;
  }
  /**
   * Returns a pseudo-random integer and a decimal based on the passed seed
   */
  getRandomNumber(seed = null) {
    return this._random.getRandomNumber(seed);
  }
  scopeWithFocus(contextItemIndex, contextItem, contextSequence) {
    return new _DynamicContext(
      {
        contextItem,
        contextItemIndex,
        contextSequence: contextSequence || this.contextSequence,
        variableBindings: this.variableBindings
      },
      this._temporalContext,
      this._random
    );
  }
  scopeWithVariableBindings(variableBindings) {
    return new _DynamicContext(
      {
        contextItem: this.contextItem,
        contextItemIndex: this.contextItemIndex,
        contextSequence: this.contextSequence,
        variableBindings: Object.assign(
          /* @__PURE__ */ Object.create(null),
          this.variableBindings,
          variableBindings
        )
      },
      this._temporalContext,
      this._random
    );
  }
};
var DynamicContext_default = DynamicContext;

// ../gh/fontoxpath/src/expressions/ExecutionParameters.ts
var ExecutionParameters = class {
  constructor(debug, disableCache, domFacade2, nodesFactory, documentWriter, currentContext, rootPointerByRootNodeMap, logger, xmlSerializer) {
    this.debug = debug;
    this.disableCache = disableCache;
    this.domFacade = domFacade2;
    this.nodesFactory = nodesFactory;
    this.documentWriter = documentWriter;
    this.currentContext = currentContext;
    this.rootPointerByRootNodeMap = rootPointerByRootNodeMap;
    this.logger = logger;
    this.xmlSerializer = xmlSerializer;
  }
};

// ../gh/fontoxpath/src/expressions/util/concatSequences.ts
function concatSequences(sequences) {
  let i4 = 0;
  let iterator = null;
  let isFirst = true;
  return sequenceFactory_default.create({
    next: (hint) => {
      while (i4 < sequences.length) {
        if (!iterator) {
          iterator = sequences[i4].value;
          isFirst = true;
        }
        const value = iterator.next(isFirst ? 0 /* NONE */ : hint);
        isFirst = false;
        if (value.done) {
          i4++;
          iterator = null;
          continue;
        }
        return value;
      }
      return DONE_TOKEN;
    }
  });
}

// ../gh/fontoxpath/src/expressions/XPathErrors.ts
var errFORG0001 = (value, type, reason) => new Error(
  `FORG0001: Cannot cast ${value} to ${valueTypeToString(type)}${reason ? `, ${reason}` : ""}`
);
var errXPDY0002 = (message) => new Error(`XPDY0002: ${message}`);
var errXPTY0004 = (message) => new Error(`XPTY0004: ${message}`);
var errFOTY0013 = (type) => new Error(`FOTY0013: Atomization is not supported for ${valueTypeToString(type)}.`);
var errXPST0081 = (prefix2) => new Error(`XPST0081: The prefix ${prefix2} could not be resolved.`);

// ../gh/fontoxpath/src/expressions/dataTypes/atomize.ts
function atomizeSingleValue(value, executionParameters) {
  if (isSubtypeOf(value.type, 46 /* XSANYATOMICTYPE */) || isSubtypeOf(value.type, 19 /* XSUNTYPEDATOMIC */) || isSubtypeOf(value.type, 0 /* XSBOOLEAN */) || isSubtypeOf(value.type, 4 /* XSDECIMAL */) || isSubtypeOf(value.type, 3 /* XSDOUBLE */) || isSubtypeOf(value.type, 6 /* XSFLOAT */) || isSubtypeOf(value.type, 5 /* XSINTEGER */) || isSubtypeOf(value.type, 2 /* XSNUMERIC */) || isSubtypeOf(value.type, 23 /* XSQNAME */) || isSubtypeOf(value.type, 1 /* XSSTRING */)) {
    return sequenceFactory_default.create(value);
  }
  const domFacade2 = executionParameters.domFacade;
  if (isSubtypeOf(value.type, 53 /* NODE */)) {
    const pointer = value.value;
    if (pointer.node.nodeType === 2 /* ATTRIBUTE_NODE */ || pointer.node.nodeType === 3 /* TEXT_NODE */) {
      return sequenceFactory_default.create(
        createAtomicValue(domFacade2.getDataFromPointer(pointer), 19 /* XSUNTYPEDATOMIC */)
      );
    }
    if (pointer.node.nodeType === 8 /* COMMENT_NODE */ || pointer.node.nodeType === 7 /* PROCESSING_INSTRUCTION_NODE */) {
      return sequenceFactory_default.create(
        createAtomicValue(domFacade2.getDataFromPointer(pointer), 1 /* XSSTRING */)
      );
    }
    const allTexts = [];
    (function getTextNodes(aNode) {
      if (pointer.node.nodeType === 8 /* COMMENT_NODE */ || pointer.node.nodeType === 7 /* PROCESSING_INSTRUCTION_NODE */) {
        return;
      }
      const aNodeType = aNode["nodeType"];
      if (aNodeType === 3 /* TEXT_NODE */ || aNodeType === 4 /* CDATA_SECTION_NODE */) {
        allTexts.push(
          domFacade2.getData(aNode)
        );
        return;
      }
      if (aNodeType === 1 /* ELEMENT_NODE */ || aNodeType === 9 /* DOCUMENT_NODE */ || aNodeType === 11 /* DOCUMENT_FRAGMENT_NODE */) {
        const children = domFacade2.getChildNodes(
          aNode
        );
        children.forEach((child) => {
          getTextNodes(child);
        });
      }
    })(pointer.node);
    return sequenceFactory_default.create(
      createAtomicValue(allTexts.join(""), 19 /* XSUNTYPEDATOMIC */)
    );
  }
  if (isSubtypeOf(value.type, 60 /* FUNCTION */) && !isSubtypeOf(value.type, 62 /* ARRAY */)) {
    throw errFOTY0013(value.type);
  }
  if (isSubtypeOf(value.type, 62 /* ARRAY */)) {
    const arrayValue = value;
    return concatSequences(
      arrayValue.members.map(
        (getMemberSequence) => atomize(getMemberSequence(), executionParameters)
      )
    );
  }
  throw new Error(`Atomizing ${value.type} is not implemented.`);
}
function atomize(sequence2, executionParameters) {
  let done = false;
  const it = sequence2.value;
  let currentOutput = null;
  return sequenceFactory_default.create({
    next: () => {
      while (!done) {
        if (!currentOutput) {
          const inputItem = it.next(0 /* NONE */);
          if (inputItem.done) {
            done = true;
            break;
          }
          const outputSequence = atomizeSingleValue(inputItem.value, executionParameters);
          currentOutput = outputSequence.value;
        }
        const itemToOutput = currentOutput.next(0 /* NONE */);
        if (itemToOutput.done) {
          currentOutput = null;
          continue;
        }
        return itemToOutput;
      }
      return DONE_TOKEN;
    }
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/typeHelpers.ts
function getPrimitiveTypeName(typeName2) {
  let type = builtinDataTypesByType_default[typeName2];
  while (type && type.variety !== 0 /* PRIMITIVE */) {
    type = type.parent;
  }
  return !type ? null : type.type;
}
function normalizeWhitespace(input, typeName2) {
  const type = builtinDataTypesByType_default[typeName2];
  const restrictionsByName = type.restrictionsByName;
  if (!restrictionsByName || !restrictionsByName.whiteSpace) {
    if (!type.parent) {
      return input;
    }
    return normalizeWhitespace(input, type.parent.type);
  }
  const whiteSpaceType = type.restrictionsByName.whiteSpace;
  switch (whiteSpaceType) {
    case "preserve":
      return input;
    case "replace":
      return input.replace(/[\u0009\u000A\u000D]/g, " ");
    case "collapse":
      return input.replace(/[\u0009\u000A\u000D]/g, " ").replace(/ {2,}/g, " ").replace(/^ | $/g, "");
  }
  return input;
}
function validatePattern(input, type) {
  let typeModel = builtinDataTypesByType_default[type];
  while (typeModel && typeModel.validator === null) {
    if (typeModel.variety === 2 /* LIST */ || typeModel.variety === 3 /* UNION */) {
      return true;
    }
    typeModel = typeModel.parent;
  }
  if (!typeModel) {
    return true;
  }
  return typeModel.validator(input);
}
function getHandlerForFacet(typeModel, facetName) {
  while (typeModel) {
    if (typeModel.facetHandlers && typeModel.facetHandlers[facetName]) {
      return typeModel.facetHandlers[facetName];
    }
    typeModel = typeModel.parent;
  }
  return () => true;
}
function validateRestrictions(value, valueType) {
  let type = builtinDataTypesByType_default[valueType];
  while (type) {
    if (!type.restrictionsByName) {
      type = type.parent;
      continue;
    }
    const matchesRestrictions = Object.keys(type.restrictionsByName).every(
      (restrictionName) => {
        if (restrictionName === "whiteSpace") {
          return true;
        }
        const validationFunction = getHandlerForFacet(type, restrictionName);
        if (!validationFunction) {
          return true;
        }
        return validationFunction(value, type.restrictionsByName[restrictionName]);
      }
    );
    if (!matchesRestrictions) {
      return false;
    }
    type = type.parent;
  }
  return true;
}
function doesTypeAllowEmpty(type) {
  if (!type) {
    return true;
  }
  return type.mult === 2 /* ZERO_OR_MORE */ || type.mult === 0 /* ZERO_OR_ONE */;
}
function doesTypeAllowMultiple(type) {
  if (!type) {
    return true;
  }
  return type.mult === 2 /* ZERO_OR_MORE */ || type.mult === 1 /* ONE_OR_MORE */;
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToAnyURI.ts
var createAnyURIValue = (value) => createAtomicValue(value, 20 /* XSANYURI */);
function castToAnyURI(instanceOf2) {
  if (instanceOf2(1 /* XSSTRING */) || instanceOf2(19 /* XSUNTYPEDATOMIC */)) {
    return (value) => ({
      successful: true,
      value: createAnyURIValue(value)
    });
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:anyURI or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToBase64Binary.ts
var createBase64BinaryValue = (value) => createAtomicValue(value, 21 /* XSBASE64BINARY */);
function hexToString(hex) {
  let text = "";
  for (let i4 = 0; i4 < hex.length; i4 += 2) {
    text += String.fromCharCode(parseInt(hex.substr(i4, 2), 16));
  }
  return text;
}
function castToBase64Binary(instanceOf2) {
  if (instanceOf2(22 /* XSHEXBINARY */)) {
    return (value) => ({
      successful: true,
      value: createBase64BinaryValue(btoa(hexToString(value)))
    });
  }
  if (instanceOf2(1 /* XSSTRING */) || instanceOf2(19 /* XSUNTYPEDATOMIC */)) {
    return (value) => ({
      successful: true,
      value: createBase64BinaryValue(value)
    });
  }
  return () => ({
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:base64Binary or any of its derived types."
    ),
    successful: false
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToBoolean.ts
function castToBoolean(instanceOf2) {
  if (instanceOf2(2 /* XSNUMERIC */)) {
    return (value) => ({
      successful: true,
      value: value === 0 || isNaN(value) ? falseBoolean : trueBoolean
    });
  }
  if (instanceOf2(1 /* XSSTRING */) || instanceOf2(19 /* XSUNTYPEDATOMIC */)) {
    return (value) => {
      switch (value) {
        case "true":
        case "1":
          return {
            successful: true,
            value: trueBoolean
          };
        case "false":
        case "0":
          return {
            successful: true,
            value: falseBoolean
          };
        default:
          return {
            successful: false,
            error: new Error(
              "XPTY0004: Casting not supported from given type to xs:boolean or any of its derived types."
            )
          };
      }
    };
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:boolean or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToDate.ts
var createDateValue = (value) => createAtomicValue(value, 7 /* XSDATE */);
function castToDate(instanceOf2) {
  if (instanceOf2(9 /* XSDATETIME */)) {
    return (value) => ({
      successful: true,
      value: createDateValue(value.convertToType(7 /* XSDATE */))
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => ({
      successful: true,
      value: createDateValue(DateTime_default.fromString(value))
    });
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:date or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToDateTime.ts
var createDateTimeValue = (value) => createAtomicValue(value, 9 /* XSDATETIME */);
function castToDateTime(instanceOf2) {
  if (instanceOf2(7 /* XSDATE */)) {
    return (value) => ({
      successful: true,
      value: createDateTimeValue(value.convertToType(9 /* XSDATETIME */))
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => ({
      successful: true,
      value: createDateTimeValue(DateTime_default.fromString(value))
    });
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:dateTime or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToDayTimeDuration.ts
var createDayTimeDurationValue = (value) => createAtomicValue(value, 17 /* XSDAYTIMEDURATION */);
function castToDayTimeDuration(instanceOf2) {
  if (instanceOf2(18 /* XSDURATION */) && !instanceOf2(16 /* XSYEARMONTHDURATION */)) {
    return (value) => ({
      successful: true,
      value: createDayTimeDurationValue(value.getDayTimeDuration())
    });
  }
  if (instanceOf2(16 /* XSYEARMONTHDURATION */)) {
    return () => ({
      successful: true,
      value: createDayTimeDurationValue(DayTimeDuration_default.fromString("PT0.0S"))
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => {
      const parsedDuration = DayTimeDuration_default.fromString(value);
      if (parsedDuration) {
        return {
          successful: true,
          value: createDayTimeDurationValue(parsedDuration)
        };
      }
      return {
        successful: false,
        error: new Error(`FORG0001: Can not cast ${value} to xs:dayTimeDuration`)
      };
    };
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:dayTimeDuration or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToDecimal.ts
function castToDecimal(instanceOf2) {
  if (instanceOf2(5 /* XSINTEGER */)) {
    return (value) => ({
      successful: true,
      value: createAtomicValue(value, 4 /* XSDECIMAL */)
    });
  }
  if (instanceOf2(6 /* XSFLOAT */) || instanceOf2(3 /* XSDOUBLE */)) {
    return (value) => {
      if (isNaN(value) || !isFinite(value)) {
        return {
          successful: false,
          error: new Error(`FOCA0002: Can not cast ${value} to xs:decimal`)
        };
      }
      if (Math.abs(value) > Number.MAX_VALUE) {
        return {
          successful: false,
          error: new Error(
            `FOAR0002: Can not cast ${value} to xs:decimal, it is out of bounds for JavaScript numbers`
          )
        };
      }
      const inexactValue = createAtomicValue(value, 4 /* XSDECIMAL */);
      if (!Number.isInteger(value)) inexactValue.inexact = true;
      return {
        successful: true,
        value: inexactValue
      };
    };
  }
  if (instanceOf2(0 /* XSBOOLEAN */)) {
    return (value) => ({
      successful: true,
      value: createAtomicValue(value ? 1 : 0, 4 /* XSDECIMAL */)
    });
  }
  if (instanceOf2(1 /* XSSTRING */) || instanceOf2(19 /* XSUNTYPEDATOMIC */)) {
    return (value) => {
      const lexicalOk = /^[ \t\r\n]*[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)[ \t\r\n]*$/.test(String(value));
      const decimalValue = lexicalOk ? parseFloat(value) : NaN;
      if (!isNaN(decimalValue)) {
        return {
          successful: true,
          value: createAtomicValue(decimalValue, 4 /* XSDECIMAL */)
        };
      }
      return {
        successful: false,
        error: new Error(`FORG0001: Can not cast ${value} to xs:decimal`)
      };
    };
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:decimal or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToFloatLikeType.ts
function castToFloatLikeType(instanceOf2, to) {
  if (instanceOf2(2 /* XSNUMERIC */)) {
    return (value) => ({
      successful: true,
      value
    });
  }
  if (instanceOf2(0 /* XSBOOLEAN */)) {
    return (value) => ({
      successful: true,
      value: value ? 1 : 0
    });
  }
  if (instanceOf2(1 /* XSSTRING */) || instanceOf2(19 /* XSUNTYPEDATOMIC */)) {
    return (value) => {
      switch (value) {
        case "NaN":
          return {
            successful: true,
            value: NaN
          };
        case "INF":
        case "+INF":
          return {
            successful: true,
            value: Infinity
          };
        case "-INF":
          return {
            successful: true,
            value: -Infinity
          };
        case "0":
        case "+0":
          return {
            successful: true,
            value: 0
          };
        case "-0":
          return {
            successful: true,
            value: -0
          };
      }
      const floatValue = parseFloat(value);
      if (!isNaN(floatValue)) {
        return {
          successful: true,
          value: floatValue
        };
      }
      return {
        successful: false,
        error: errFORG0001(value, to)
      };
    };
  }
  return () => ({
    successful: false,
    error: new Error(
      `XPTY0004: Casting not supported from given type to ${to} or any of its derived types.`
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToDouble.ts
function castToDouble(instanceOf2) {
  const caster = castToFloatLikeType(instanceOf2, 3 /* XSDOUBLE */);
  return (value) => {
    const castResult = caster(value);
    if (!castResult.successful) {
      return castResult;
    }
    return {
      successful: true,
      value: createAtomicValue(castResult.value, 3 /* XSDOUBLE */)
    };
  };
}

// ../gh/fontoxpath/src/expressions/dataTypes/valueTypes/YearMonthDuration.ts
var YearMonthDuration = class extends AbstractDuration_default {
  constructor(months) {
    super();
    if (months > Number.MAX_SAFE_INTEGER || months < Number.MIN_SAFE_INTEGER) {
      throw new Error(
        "FODT0002: Number of months given to construct YearMonthDuration overflows MAX_SAFE_INTEGER or MIN_SAFE_INTEGER"
      );
    }
    this.months = months;
  }
  getMonths() {
    const result = this.months % 12;
    return result === 0 ? 0 : result;
  }
  getRawMonths() {
    return this.months;
  }
  getYears() {
    return Math.trunc(this.months / 12);
  }
  isPositive() {
    return Object.is(-0, this.months) ? false : this.months >= 0;
  }
  negate() {
    return new this.constructor(-this.months);
  }
  toString() {
    return (this.isPositive() ? "P" : "-P") + this.toStringWithoutP();
  }
  toStringWithoutP() {
    const years = Math.abs(this.getYears());
    const months = Math.abs(this.getMonths());
    const stringValue = `${years ? `${years}Y` : ""}${months ? `${months}M` : ""}`;
    return stringValue || "0M";
  }
};
YearMonthDuration.fromParts = (years, months, isPositive) => {
  const totalMonths = years * 12 + months;
  if (totalMonths > Number.MAX_SAFE_INTEGER || !Number.isFinite(totalMonths)) {
    throw new Error("FODT0002: Value overflow while constructing xs:yearMonthDuration");
  }
  return new YearMonthDuration(isPositive || totalMonths === 0 ? totalMonths : -totalMonths);
};
YearMonthDuration.fromString = (yearMonthDurationString) => {
  const regex2 = /^(-)?P(\d+Y)?(\d+M)?(\d+D)?(?:T(\d+H)?(\d+M)?(\d+(\.\d*)?S)?)?$/;
  const match = regex2.exec(yearMonthDurationString);
  if (!match) {
    return null;
  }
  const isPositive = !match[1];
  const years = match[2] ? parseInt(match[2], 10) : 0;
  const months = match[3] ? parseInt(match[3], 10) : 0;
  return YearMonthDuration.fromParts(years, months, isPositive);
};
function lessThan3(yearMonthDuration1, yearMonthDuration2) {
  return yearMonthDuration1.months < yearMonthDuration2.months;
}
function greaterThan3(yearMonthDuration1, yearMonthDuration2) {
  return yearMonthDuration1.months > yearMonthDuration2.months;
}
function add2(yearMonthDuration1, yearMonthDuration2) {
  return new YearMonthDuration(yearMonthDuration1.months + yearMonthDuration2.months);
}
function subtract3(yearMonthDuration1, yearMonthDuration2) {
  return new YearMonthDuration(yearMonthDuration1.months - yearMonthDuration2.months);
}
function multiply2(yearMonthDuration, double) {
  if (isNaN(double)) {
    throw new Error("FOCA0005: Cannot multiply xs:yearMonthDuration by NaN");
  }
  const result = Math.round(yearMonthDuration.months * double);
  if (result > Number.MAX_SAFE_INTEGER || !Number.isFinite(result)) {
    throw new Error("FODT0002: Value overflow while constructing xs:yearMonthDuration");
  }
  return new YearMonthDuration(result < Number.MIN_SAFE_INTEGER || result === 0 ? 0 : result);
}
function divide2(yearMonthDuration, double) {
  if (isNaN(double)) {
    throw new Error("FOCA0005: Cannot divide xs:yearMonthDuration by NaN");
  }
  const result = Math.round(yearMonthDuration.months / double);
  if (result > Number.MAX_SAFE_INTEGER || !Number.isFinite(result)) {
    throw new Error("FODT0002: Value overflow while dividing xs:yearMonthDuration");
  }
  return new YearMonthDuration(result < Number.MIN_SAFE_INTEGER || result === 0 ? 0 : result);
}
function divideByYearMonthDuration(yearMonthDuration1, yearMonthDuration2) {
  return yearMonthDuration1.months / yearMonthDuration2.months;
}
var YearMonthDuration_default = YearMonthDuration;

// ../gh/fontoxpath/src/expressions/dataTypes/valueTypes/Duration.ts
var MONTHS_TO_MIN_MAX_VALUES = [
  [28, 31],
  [59, 62],
  [89, 91],
  [120, 123],
  [150, 153],
  [181, 184],
  [212, 215],
  [242, 245],
  [273, 276],
  [303, 306],
  [334, 337],
  [365, 366]
];
function computeMinDays(duration) {
  const years = Math.abs(duration.getYears());
  const months = Math.abs(duration.getMonths());
  const minNumberOfLeapYears = Math.floor(years / 4);
  return Math.abs(duration.getDays()) + (months === 0 ? 0 : MONTHS_TO_MIN_MAX_VALUES[months - 1][0]) + minNumberOfLeapYears * 366 + (years - minNumberOfLeapYears) * 365;
}
function computeMaxDays(duration) {
  const years = Math.abs(duration.getYears());
  const months = Math.abs(duration.getMonths());
  const maxNumberOfLeapYears = Math.ceil(years / 4);
  return Math.abs(duration.getDays()) + (months === 0 ? 0 : MONTHS_TO_MIN_MAX_VALUES[months - 1][1]) + maxNumberOfLeapYears * 366 + (years - maxNumberOfLeapYears) * 365;
}
var Duration = class extends AbstractDuration_default {
  constructor(yearMonthDuration, dayTimeDuration) {
    super();
    this._yearMonthDuration = yearMonthDuration;
    this._dayTimeDuration = dayTimeDuration;
  }
  compare(other) {
    if (this.isPositive() && !other.isPositive()) {
      return 1;
    }
    if (!this.isPositive() && other.isPositive()) {
      return -1;
    }
    if (this.equals(other)) {
      return 0;
    }
    const thisMinDays = computeMinDays(this);
    const thisMaxDays = computeMaxDays(this);
    const otherMinDays = computeMinDays(other);
    const otherMaxDays = computeMaxDays(other);
    if (thisMinDays === otherMinDays && thisMaxDays === otherMaxDays) {
      const thisSecondsWithoutDays = this.getHours() * 3600 + this.getMinutes() * 60 + this.getSeconds();
      const otherSecondsWithoutDays = other.getHours() * 3600 + other.getMinutes() * 60 + other.getSeconds();
      if (thisSecondsWithoutDays > otherSecondsWithoutDays) {
        return 1;
      }
      if (thisSecondsWithoutDays < otherSecondsWithoutDays) {
        return -1;
      }
      return 0;
    }
    const bothPositive = this.isPositive() && other.isPositive();
    if (thisMinDays > otherMaxDays) {
      return bothPositive ? 1 : -1;
    }
    if (thisMaxDays < otherMinDays) {
      return bothPositive ? -1 : 1;
    }
  }
  getDays() {
    return this._dayTimeDuration.getDays();
  }
  getDayTimeDuration() {
    return this._dayTimeDuration;
  }
  getHours() {
    return this._dayTimeDuration.getHours();
  }
  getMinutes() {
    return this._dayTimeDuration.getMinutes();
  }
  getMonths() {
    return this._yearMonthDuration.getMonths();
  }
  getRawMonths() {
    return this._yearMonthDuration.getRawMonths();
  }
  getRawSeconds() {
    return this._dayTimeDuration.getRawSeconds();
  }
  getSeconds() {
    return this._dayTimeDuration.getSeconds();
  }
  getYearMonthDuration() {
    return this._yearMonthDuration;
  }
  getYears() {
    return this._yearMonthDuration.getYears();
  }
  isPositive() {
    return this._yearMonthDuration.isPositive() && this._dayTimeDuration.isPositive();
  }
  negate() {
    return new this.constructor(
      this._yearMonthDuration.negate(),
      this._dayTimeDuration.negate()
    );
  }
  toString() {
    const durationString = this.isPositive() ? "P" : "-P";
    const TYM = this._yearMonthDuration.toStringWithoutP();
    const TDT = this._dayTimeDuration.toStringWithoutP();
    if (TYM === "0M") {
      return durationString + TDT;
    }
    if (TDT === "T0S") {
      return durationString + TYM;
    }
    return durationString + TYM + TDT;
  }
};
Duration.fromString = (durationString) => {
  return new Duration(
    YearMonthDuration_default.fromString(durationString),
    DayTimeDuration_default.fromString(durationString)
  );
};
Duration.fromYearMonthDuration = (yearMonthDuration) => {
  return new Duration(
    yearMonthDuration,
    new DayTimeDuration_default(yearMonthDuration.isPositive() ? 0 : -0)
  );
};
Duration.fromDayTimeDuration = (dayTimeDuration) => {
  return new Duration(
    new YearMonthDuration_default(dayTimeDuration.isPositive() ? 0 : -0),
    dayTimeDuration
  );
};
var Duration_default = Duration;

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToDuration.ts
var createDurationValue = (value) => createAtomicValue(value, 18 /* XSDURATION */);
function castToDuration(instanceOf2) {
  if (instanceOf2(16 /* XSYEARMONTHDURATION */)) {
    return (value) => ({
      successful: true,
      value: createDurationValue(Duration_default.fromYearMonthDuration(value))
    });
  }
  if (instanceOf2(17 /* XSDAYTIMEDURATION */)) {
    return (value) => ({
      successful: true,
      value: createDurationValue(Duration_default.fromDayTimeDuration(value))
    });
  }
  if (instanceOf2(18 /* XSDURATION */)) {
    return (value) => ({
      successful: true,
      value: createDurationValue(value)
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => {
      const parsedDuration = Duration_default.fromString(value);
      if (parsedDuration) {
        return {
          successful: true,
          value: createDurationValue(parsedDuration)
        };
      }
      return {
        successful: false,
        error: new Error(`FORG0001: Can not cast ${value} to xs:duration`)
      };
    };
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:duration or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToFloat.ts
function castToFloat(instanceOf2) {
  const caster = castToFloatLikeType(instanceOf2, 6 /* XSFLOAT */);
  return (value) => {
    const castResult = caster(value);
    if (!castResult.successful) {
      return castResult;
    }
    return {
      successful: true,
      value: createAtomicValue(castResult.value, 6 /* XSFLOAT */)
    };
  };
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToGDay.ts
var createGDayValue = (value) => createAtomicValue(value, 15 /* XSGDAY */);
function castToGDay(instanceOf2) {
  if (instanceOf2(7 /* XSDATE */) || instanceOf2(9 /* XSDATETIME */)) {
    return (value) => ({
      successful: true,
      value: createGDayValue(value.convertToType(15 /* XSGDAY */))
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => ({
      successful: true,
      value: createGDayValue(DateTime_default.fromString(value))
    });
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:gDay or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToGMonth.ts
var createGMonthValue = (value) => createAtomicValue(value, 14 /* XSGMONTH */);
function castToGMonth(instanceOf2) {
  if (instanceOf2(7 /* XSDATE */) || instanceOf2(9 /* XSDATETIME */)) {
    return (value) => ({
      successful: true,
      value: createGMonthValue(value.convertToType(14 /* XSGMONTH */))
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => ({
      successful: true,
      value: createGMonthValue(DateTime_default.fromString(value))
    });
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:gMonth or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToGMonthDay.ts
var createGMonthDayValue = (value) => createAtomicValue(value, 13 /* XSGMONTHDAY */);
function castToGMonthDay(instanceOf2) {
  if (instanceOf2(7 /* XSDATE */) || instanceOf2(9 /* XSDATETIME */)) {
    return (value) => ({
      successful: true,
      value: createGMonthDayValue(value.convertToType(13 /* XSGMONTHDAY */))
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => ({
      successful: true,
      value: createGMonthDayValue(DateTime_default.fromString(value))
    });
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:gMonthDay or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToGYear.ts
var createGYearValue = (value) => createAtomicValue(value, 12 /* XSGYEAR */);
function castToGYear(instanceOf2) {
  if (instanceOf2(7 /* XSDATE */) || instanceOf2(9 /* XSDATETIME */)) {
    return (value) => ({
      successful: true,
      value: createGYearValue(value.convertToType(12 /* XSGYEAR */))
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => ({
      successful: true,
      value: createGYearValue(DateTime_default.fromString(value))
    });
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:gYear or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToGYearMonth.ts
var createGYearMonthValue = (value) => createAtomicValue(value, 11 /* XSGYEARMONTH */);
function castToGYearMonth(instanceOf2) {
  if (instanceOf2(7 /* XSDATE */) || instanceOf2(9 /* XSDATETIME */)) {
    return (value) => ({
      successful: true,
      value: createGYearMonthValue(value.convertToType(11 /* XSGYEARMONTH */))
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => ({
      successful: true,
      value: createGYearMonthValue(DateTime_default.fromString(value))
    });
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:gYearMonth or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToHexBinary.ts
var createHexBinaryValue = (value) => createAtomicValue(value, 22 /* XSHEXBINARY */);
function stringToHex(s3) {
  let hex = "";
  for (let i4 = 0, l3 = s3.length; i4 < l3; i4++) {
    hex += Number(s3.charCodeAt(i4)).toString(16);
  }
  return hex.toUpperCase();
}
function castToHexBinary(instanceOf2) {
  if (instanceOf2(21 /* XSBASE64BINARY */)) {
    return (value) => ({
      successful: true,
      value: createHexBinaryValue(stringToHex(atob(value)))
    });
  }
  if (instanceOf2(1 /* XSSTRING */) || instanceOf2(19 /* XSUNTYPEDATOMIC */)) {
    return (value) => ({
      successful: true,
      value: createHexBinaryValue(value)
    });
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:hexBinary or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToInteger.ts
var createIntegerValue = (value) => createAtomicValue(value, 5 /* XSINTEGER */);
function castToInteger(instanceOf2) {
  if (instanceOf2(0 /* XSBOOLEAN */)) {
    return (value) => ({
      successful: true,
      value: createIntegerValue(value ? 1 : 0)
    });
  }
  if (instanceOf2(2 /* XSNUMERIC */)) {
    return (value) => {
      const integerValue = Math.trunc(value);
      if (!isFinite(integerValue) || isNaN(integerValue)) {
        return {
          successful: false,
          error: new Error(`FOCA0002: can not cast ${value} to xs:integer`)
        };
      }
      if (!Number.isSafeInteger(integerValue)) {
        return {
          successful: false,
          error: new Error(
            `FOAR0002: can not cast ${value} to xs:integer, it is out of bounds for JavaScript numbers.`
          )
        };
      }
      return {
        successful: true,
        value: createIntegerValue(integerValue)
      };
    };
  }
  if (instanceOf2(1 /* XSSTRING */) || instanceOf2(19 /* XSUNTYPEDATOMIC */)) {
    return (value) => {
      const integerValue = parseInt(value, 10);
      if (isNaN(integerValue)) {
        return {
          successful: false,
          error: errFORG0001(value, 5 /* XSINTEGER */)
        };
      }
      if (!Number.isSafeInteger(integerValue)) {
        return {
          successful: false,
          error: new Error(
            `FOCA0003: can not cast ${value} to xs:integer, it is out of bounds for JavaScript numbers.`
          )
        };
      }
      return {
        successful: true,
        value: createIntegerValue(integerValue)
      };
    };
  }
  return (value) => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:integer or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToNumeric.ts
var numericTypes = [
  3 /* XSDOUBLE */,
  6 /* XSFLOAT */,
  4 /* XSDECIMAL */,
  5 /* XSINTEGER */
];
function castToNumeric(inputType, castToPrimitiveType2) {
  return (value) => {
    for (const outputType of numericTypes) {
      const result = castToPrimitiveType2(inputType, outputType)(value);
      if (result.successful) {
        return result;
      }
    }
    return {
      successful: false,
      error: new Error(
        `XPTY0004: Casting not supported from "${value}" given type to xs:numeric or any of its derived types.`
      )
    };
  };
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToStringLikeType.ts
function castToStringLikeType(instanceOf2) {
  if (instanceOf2(1 /* XSSTRING */) || instanceOf2(19 /* XSUNTYPEDATOMIC */)) {
    return (value) => ({
      successful: true,
      value: value + ""
    });
  }
  if (instanceOf2(20 /* XSANYURI */)) {
    return (value) => ({
      successful: true,
      value
    });
  }
  if (instanceOf2(23 /* XSQNAME */)) {
    return (value) => {
      return {
        successful: true,
        value: value.prefix ? `${value.prefix}:${value.localName}` : value.localName
      };
    };
  }
  if (instanceOf2(44 /* XSNOTATION */)) {
    return (value) => ({
      successful: true,
      value: value.toString()
    });
  }
  if (instanceOf2(2 /* XSNUMERIC */)) {
    if (instanceOf2(5 /* XSINTEGER */) || instanceOf2(4 /* XSDECIMAL */)) {
      return (value) => ({
        successful: true,
        value: (value + "").replace("e", "E")
      });
    }
    if (instanceOf2(6 /* XSFLOAT */) || instanceOf2(3 /* XSDOUBLE */)) {
      return (value) => {
        if (isNaN(value)) {
          return {
            successful: true,
            value: "NaN"
          };
        }
        if (!isFinite(value)) {
          return {
            successful: true,
            value: `${value < 0 ? "-" : ""}INF`
          };
        }
        if (Object.is(value, -0)) {
          return {
            successful: true,
            value: "-0"
          };
        }
        return {
          successful: true,
          value: (value + "").replace("e", "E").replace("E+", "E")
        };
      };
    }
  }
  if (instanceOf2(9 /* XSDATETIME */) || instanceOf2(7 /* XSDATE */) || instanceOf2(8 /* XSTIME */) || instanceOf2(15 /* XSGDAY */) || instanceOf2(14 /* XSGMONTH */) || instanceOf2(13 /* XSGMONTHDAY */) || instanceOf2(12 /* XSGYEAR */) || instanceOf2(11 /* XSGYEARMONTH */)) {
    return (value) => ({
      successful: true,
      value: value.toString()
    });
  }
  if (instanceOf2(16 /* XSYEARMONTHDURATION */)) {
    return (value) => ({
      successful: true,
      value: value.toString()
    });
  }
  if (instanceOf2(17 /* XSDAYTIMEDURATION */)) {
    return (value) => ({
      successful: true,
      value: value.toString()
    });
  }
  if (instanceOf2(18 /* XSDURATION */)) {
    return (value) => ({
      successful: true,
      value: value.toString()
    });
  }
  if (instanceOf2(22 /* XSHEXBINARY */)) {
    return (value) => ({
      successful: true,
      value: value.toUpperCase()
    });
  }
  return (value) => ({
    successful: true,
    value: value + ""
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToString.ts
function castToString(instanceOf2) {
  const caster = castToStringLikeType(instanceOf2);
  return (value) => {
    const castResult = caster(value);
    if (!castResult.successful) {
      return castResult;
    }
    return {
      successful: true,
      value: createAtomicValue(castResult.value, 1 /* XSSTRING */)
    };
  };
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToTime.ts
var createTimeValue = (value) => createAtomicValue(value, 8 /* XSTIME */);
function castToTime(instanceOf2) {
  if (instanceOf2(9 /* XSDATETIME */)) {
    return (value) => ({
      successful: true,
      value: createTimeValue(value.convertToType(8 /* XSTIME */))
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => ({
      successful: true,
      value: createTimeValue(DateTime_default.fromString(value))
    });
  }
  return (value) => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:time or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToUntypedAtomic.ts
function castToUntypedAtomic(instanceOf2) {
  const caster = castToStringLikeType(instanceOf2);
  return (value) => {
    const castResult = caster(value);
    if (!castResult.successful) {
      return castResult;
    }
    return {
      successful: true,
      value: createAtomicValue(castResult.value, 19 /* XSUNTYPEDATOMIC */)
    };
  };
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/castToYearMonthDuration.ts
var createYearMonthDurationValue = (value) => createAtomicValue(value, 16 /* XSYEARMONTHDURATION */);
function castToYearMonthDuration(instanceOf2) {
  if (instanceOf2(18 /* XSDURATION */) && !instanceOf2(17 /* XSDAYTIMEDURATION */)) {
    return (value) => ({
      successful: true,
      value: createYearMonthDurationValue(value.getYearMonthDuration())
    });
  }
  if (instanceOf2(17 /* XSDAYTIMEDURATION */)) {
    return (_value) => ({
      successful: true,
      value: createYearMonthDurationValue(YearMonthDuration_default.fromString("P0M"))
    });
  }
  if (instanceOf2(19 /* XSUNTYPEDATOMIC */) || instanceOf2(1 /* XSSTRING */)) {
    return (value) => {
      const parsedDuration = YearMonthDuration_default.fromString(value);
      if (parsedDuration) {
        return {
          successful: true,
          value: createYearMonthDurationValue(parsedDuration)
        };
      }
      return {
        successful: false,
        error: errFORG0001(value, 16 /* XSYEARMONTHDURATION */)
      };
    };
  }
  return () => ({
    successful: false,
    error: new Error(
      "XPTY0004: Casting not supported from given type to xs:yearMonthDuration or any of its derived types."
    )
  });
}

// ../gh/fontoxpath/src/expressions/dataTypes/casting/tryCastToType.ts
var TREAT_AS_PRIMITIVE = [
  2 /* XSNUMERIC */,
  5 /* XSINTEGER */,
  17 /* XSDAYTIMEDURATION */,
  16 /* XSYEARMONTHDURATION */
];
function castToPrimitiveType(from, to) {
  const instanceOf2 = (type) => isSubtypeOf(from, type);
  if (to === 39 /* XSERROR */) {
    return () => ({
      successful: false,
      error: new Error("FORG0001: Casting to xs:error is always invalid.")
    });
  }
  switch (to) {
    case 19 /* XSUNTYPEDATOMIC */:
      return castToUntypedAtomic(instanceOf2);
    case 1 /* XSSTRING */:
      return castToString(instanceOf2);
    case 6 /* XSFLOAT */:
      return castToFloat(instanceOf2);
    case 3 /* XSDOUBLE */:
      return castToDouble(instanceOf2);
    case 4 /* XSDECIMAL */:
      return castToDecimal(instanceOf2);
    case 5 /* XSINTEGER */:
      return castToInteger(instanceOf2);
    case 2 /* XSNUMERIC */:
      return castToNumeric(from, castToPrimitiveType);
    case 18 /* XSDURATION */:
      return castToDuration(instanceOf2);
    case 16 /* XSYEARMONTHDURATION */:
      return castToYearMonthDuration(instanceOf2);
    case 17 /* XSDAYTIMEDURATION */:
      return castToDayTimeDuration(instanceOf2);
    case 9 /* XSDATETIME */:
      return castToDateTime(instanceOf2);
    case 8 /* XSTIME */:
      return castToTime(instanceOf2);
    case 7 /* XSDATE */:
      return castToDate(instanceOf2);
    case 11 /* XSGYEARMONTH */:
      return castToGYearMonth(instanceOf2);
    case 12 /* XSGYEAR */:
      return castToGYear(instanceOf2);
    case 13 /* XSGMONTHDAY */:
      return castToGMonthDay(instanceOf2);
    case 15 /* XSGDAY */:
      return castToGDay(instanceOf2);
    case 14 /* XSGMONTH */:
      return castToGMonth(instanceOf2);
    case 0 /* XSBOOLEAN */:
      return castToBoolean(instanceOf2);
    case 21 /* XSBASE64BINARY */:
      return castToBase64Binary(instanceOf2);
    case 22 /* XSHEXBINARY */:
      return castToHexBinary(instanceOf2);
    case 20 /* XSANYURI */:
      return castToAnyURI(instanceOf2);
    case 23 /* XSQNAME */:
      throw new Error("Casting to xs:QName is not implemented.");
  }
  return () => ({
    successful: false,
    error: new Error(`XPTY0004: Casting not supported from ${from} to ${to}.`)
  });
}
var precomputedCastFunctorsByTypeString = /* @__PURE__ */ Object.create(null);
function createCastingFunction(from, to) {
  if (from === 19 /* XSUNTYPEDATOMIC */ && to === 1 /* XSSTRING */) {
    return (val) => ({
      successful: true,
      value: createAtomicValue(val, 1 /* XSSTRING */)
    });
  }
  if (to === 44 /* XSNOTATION */) {
    return (_val) => ({
      successful: false,
      error: new Error("XPST0080: Casting to xs:NOTATION is not permitted.")
    });
  }
  if (to === 39 /* XSERROR */) {
    return (_val) => ({
      successful: false,
      error: new Error("FORG0001: Casting to xs:error is not permitted.")
    });
  }
  if (from === 45 /* XSANYSIMPLETYPE */ || to === 45 /* XSANYSIMPLETYPE */) {
    return (_val) => ({
      successful: false,
      error: new Error("XPST0080: Casting from or to xs:anySimpleType is not permitted.")
    });
  }
  if (from === 46 /* XSANYATOMICTYPE */ || to === 46 /* XSANYATOMICTYPE */) {
    return (_val) => ({
      successful: false,
      error: new Error("XPST0080: Casting from or to xs:anyAtomicType is not permitted.")
    });
  }
  if (isSubtypeOf(from, 60 /* FUNCTION */) && to === 1 /* XSSTRING */) {
    return (_val) => ({
      successful: false,
      error: new Error("FOTY0014: Casting from function item to xs:string is not permitted.")
    });
  }
  if (from === to) {
    return (val) => ({
      successful: true,
      value: {
        type: to,
        value: val
      }
    });
  }
  const primitiveFrom = TREAT_AS_PRIMITIVE.includes(from) ? from : getPrimitiveTypeName(from);
  const primitiveTo = TREAT_AS_PRIMITIVE.includes(to) ? to : getPrimitiveTypeName(to);
  if (primitiveTo === null || primitiveFrom === null) {
    return (_val) => ({
      successful: false,
      error: new Error(
        `XPST0081: Can not cast: type ${primitiveTo ? valueTypeToString(from) : valueTypeToString(to)} is unknown.`
      )
    });
  }
  const converters = [];
  if (primitiveFrom === 1 /* XSSTRING */ || primitiveFrom === 19 /* XSUNTYPEDATOMIC */) {
    converters.push((value) => {
      const strValue = normalizeWhitespace(value, to);
      if (!validatePattern(strValue, to)) {
        return {
          successful: false,
          error: errFORG0001(value, to, "pattern validation failed.")
        };
      }
      return {
        successful: true,
        value: strValue
      };
    });
  }
  if (primitiveFrom !== primitiveTo) {
    converters.push(castToPrimitiveType(primitiveFrom, primitiveTo));
    converters.push((value) => ({
      successful: true,
      value: value.value
    }));
  }
  if (primitiveTo === 19 /* XSUNTYPEDATOMIC */ || primitiveTo === 1 /* XSSTRING */) {
    converters.push((typedValue) => {
      if (!validatePattern(typedValue, to)) {
        return {
          successful: false,
          error: errFORG0001(typedValue, to, "pattern validation failed.")
        };
      }
      return {
        successful: true,
        value: typedValue
      };
    });
  }
  converters.push((typedValue) => {
    if (!validateRestrictions(typedValue, to)) {
      return {
        successful: false,
        error: errFORG0001(typedValue, to, "pattern validation failed.")
      };
    }
    return {
      successful: true,
      value: typedValue
    };
  });
  converters.push((typedValue) => ({
    successful: true,
    value: {
      type: to,
      value: typedValue
    }
  }));
  return (value) => {
    let result = { successful: true, value };
    for (let i4 = 0, l3 = converters.length; i4 < l3; ++i4) {
      result = converters[i4](result.value);
      if (result.successful === false) {
        return result;
      }
    }
    return result;
  };
}
function tryCastToType(valueTuple, type) {
  const index = valueTuple.type + type * 1e4;
  let prefabConverter = precomputedCastFunctorsByTypeString[index];
  if (!prefabConverter) {
    prefabConverter = precomputedCastFunctorsByTypeString[index] = createCastingFunction(
      valueTuple.type,
      type
    );
  }
  return prefabConverter.call(void 0, valueTuple.value, type);
}

// ../gh/fontoxpath/src/expressions/dataTypes/castToType.ts
function castToType(value, type) {
  const result = tryCastToType(value, type);
  if (result.successful === true) {
    return result.value;
  }
  throw result.error;
}

// ../gh/fontoxpath/src/expressions/util/createSingleValueIterator.ts
function createSingleValueIterator(onlyValue) {
  let hasPassed = false;
  return {
    next: () => {
      if (hasPassed) {
        return DONE_TOKEN;
      }
      hasPassed = true;
      return ready(onlyValue);
    }
  };
}

// ../gh/fontoxpath/src/expressions/operators/compares/arePointersEqual.ts
function areGraftAncestorsSame(graftAncestor1, graftAncestor2) {
  if (graftAncestor1 === graftAncestor2) {
    return true;
  }
  if (graftAncestor1 && graftAncestor2 && graftAncestor1.offset === graftAncestor2.offset && graftAncestor1.parent === graftAncestor2.parent) {
    return areGraftAncestorsSame(graftAncestor1.graftAncestor, graftAncestor2.graftAncestor);
  }
  return false;
}
function arePointersEqual(pointer1, pointer2) {
  if (pointer1 === pointer2 || pointer1.node === pointer2.node && areGraftAncestorsSame(pointer1.graftAncestor, pointer2.graftAncestor)) {
    return true;
  }
  return false;
}
var arePointersEqual_default = arePointersEqual;

// ../gh/fontoxpath/src/expressions/dataTypes/documentOrderUtils.ts
function compareSiblingElements(domFacade2, node1, node2) {
  const parentNode = domFacade2.getParentNodePointer(node1, null);
  const childNodes = domFacade2.getChildNodePointers(parentNode, null);
  for (let i4 = 0, l3 = childNodes.length; i4 < l3; ++i4) {
    const childNode = childNodes[i4];
    if (arePointersEqual_default(childNode, node1)) {
      return -1;
    }
    if (arePointersEqual_default(childNode, node2)) {
      return 1;
    }
  }
}
function findAllAncestorPointers(domFacade2, node) {
  const ancestors = [];
  for (let ancestor = node; ancestor; ancestor = domFacade2.getParentNodePointer(
    ancestor,
    null
  )) {
    ancestors.unshift(ancestor);
  }
  return ancestors;
}
function findAllAncestors(domFacade2, node) {
  const ancestors = [];
  for (let ancestor = node; ancestor; ancestor = domFacade2.getParentNode(ancestor, null)) {
    ancestors.unshift(ancestor);
  }
  return ancestors;
}
function wrapToPointer(node) {
  return { node, graftAncestor: null };
}
function compareElements(tieBreakerArr, domFacade2, nodeA, nodeB) {
  if (!nodeA.graftAncestor && !nodeB.graftAncestor && !isTinyNode(nodeA.node) && !isTinyNode(nodeB.node)) {
    const actualNodeA = nodeA.node;
    const actualNodeB = nodeB.node;
    if (actualNodeA === actualNodeB) {
      return 0;
    }
    const actualAncestorsA = findAllAncestors(domFacade2, actualNodeA);
    const actualAncestorsB = findAllAncestors(domFacade2, actualNodeB);
    if (actualAncestorsA[0] !== actualAncestorsB[0]) {
      const topAncestorPointerA = wrapToPointer(actualAncestorsA[0]);
      const topAncestorPointerB = wrapToPointer(actualAncestorsB[0]);
      let index1 = tieBreakerArr.findIndex((e4) => arePointersEqual_default(e4, topAncestorPointerA));
      let index2 = tieBreakerArr.findIndex((e4) => arePointersEqual_default(e4, topAncestorPointerB));
      if (index1 === -1) {
        index1 = tieBreakerArr.push(topAncestorPointerA);
      }
      if (index2 === -1) {
        index2 = tieBreakerArr.push(topAncestorPointerB);
      }
      return index1 - index2;
    }
    let y2 = 1;
    for (const z2 = Math.min(actualAncestorsA.length, actualAncestorsB.length); y2 < z2; ++y2) {
      if (actualAncestorsA[y2] !== actualAncestorsB[y2]) {
        break;
      }
    }
    const actualAncestorA = actualAncestorsA[y2];
    const actualAncestorB = actualAncestorsB[y2];
    if (!actualAncestorA) {
      return -1;
    }
    if (!actualAncestorB) {
      return 1;
    }
    const parentNode = actualAncestorsB[y2 - 1];
    const childNodes = domFacade2.getChildNodes(parentNode, null);
    for (let m2 = 0, n4 = childNodes.length; m2 < n4; ++m2) {
      const childNode = childNodes[m2];
      if (childNode === actualAncestorA) {
        return -1;
      }
      if (childNode === actualAncestorB) {
        return 1;
      }
    }
  } else {
    if (arePointersEqual_default(nodeA, nodeB)) {
      return 0;
    }
    const ancestors1 = findAllAncestorPointers(domFacade2, nodeA);
    const ancestors2 = findAllAncestorPointers(domFacade2, nodeB);
    const topAncestor1 = ancestors1[0];
    const topAncestor2 = ancestors2[0];
    if (!arePointersEqual_default(topAncestor1, topAncestor2)) {
      let index1 = tieBreakerArr.findIndex((e4) => arePointersEqual_default(e4, topAncestor1));
      let index2 = tieBreakerArr.findIndex((e4) => arePointersEqual_default(e4, topAncestor2));
      if (index1 === -1) {
        index1 = tieBreakerArr.push(topAncestor1);
      }
      if (index2 === -1) {
        index2 = tieBreakerArr.push(topAncestor2);
      }
      return index1 - index2;
    }
    let i4 = 1;
    for (const l3 = Math.min(ancestors1.length, ancestors2.length); i4 < l3; ++i4) {
      if (!arePointersEqual_default(ancestors1[i4], ancestors2[i4])) {
        break;
      }
    }
    if (!ancestors1[i4]) {
      return -1;
    }
    if (!ancestors2[i4]) {
      return 1;
    }
    return compareSiblingElements(domFacade2, ancestors1[i4], ancestors2[i4]);
  }
}
function compareNodePositionsWithTieBreaker(tieBreakerArr, domFacade2, node1, node2) {
  const isNode1SubtypeOfAttribute = isSubtypeOf(node1.type, 47 /* ATTRIBUTE */);
  const isNode2SubtypeOfAttribute = isSubtypeOf(node2.type, 47 /* ATTRIBUTE */);
  let value1;
  let value2;
  if (isNode1SubtypeOfAttribute && !isNode2SubtypeOfAttribute) {
    value1 = domFacade2.getParentNodePointer(node1.value);
    value2 = node2.value;
    if (arePointersEqual_default(value1, value2)) {
      return 1;
    }
  } else if (isNode2SubtypeOfAttribute && !isNode1SubtypeOfAttribute) {
    value1 = node1.value;
    value2 = domFacade2.getParentNodePointer(node2.value);
    if (arePointersEqual_default(value1, value2)) {
      return -1;
    }
  } else if (isNode1SubtypeOfAttribute && isNode2SubtypeOfAttribute) {
    if (arePointersEqual_default(
      domFacade2.getParentNodePointer(node2.value),
      domFacade2.getParentNodePointer(node1.value)
    )) {
      return domFacade2.getLocalName(node1.value) > domFacade2.getLocalName(node2.value) ? 1 : -1;
    }
    value1 = domFacade2.getParentNodePointer(node1.value);
    value2 = domFacade2.getParentNodePointer(node2.value);
  } else {
    value1 = node1.value;
    value2 = node2.value;
  }
  return compareElements(tieBreakerArr, domFacade2, value1, value2);
}
function compareNodePositions(domFacade2, node1, node2) {
  return compareNodePositionsWithTieBreaker(
    domFacade2.orderOfDetachedNodes,
    domFacade2,
    node1,
    node2
  );
}
function sortNodeValues(domFacade2, nodeValues) {
  return mergeSort(
    nodeValues,
    (node1, node2) => compareNodePositionsWithTieBreaker(domFacade2.orderOfDetachedNodes, domFacade2, node1, node2)
  ).filter((nodeValue, i4, sortedNodes) => {
    if (i4 === 0) {
      return true;
    }
    return !arePointersEqual_default(
      nodeValue.value,
      sortedNodes[i4 - 1].value
    );
  });
}
var defaultComparer = (value1, value2) => value1 < value2 ? -1 : 0;
function mergeSort(array, comparer = defaultComparer) {
  if (array.length <= 1) return array;
  const mid = Math.floor(array.length / 2);
  const left = mergeSort(array.slice(0, mid), comparer);
  const right = mergeSort(array.slice(mid), comparer);
  return merge(left, right, comparer);
}
function merge(leftArray, rightArray, comparer) {
  const sorted = new Array();
  while (leftArray.length && rightArray.length) {
    if (comparer(leftArray[0], rightArray[0]) < 0) {
      sorted.push(leftArray.shift());
    } else {
      sorted.push(rightArray.shift());
    }
  }
  return sorted.concat(leftArray.concat(rightArray));
}

// ../gh/fontoxpath/src/expressions/dataTypes/promoteToType.ts
function promoteToType(value, type) {
  if (isSubtypeOf(value.type, 2 /* XSNUMERIC */)) {
    if (isSubtypeOf(value.type, 6 /* XSFLOAT */)) {
      if (type === 3 /* XSDOUBLE */) {
        return createAtomicValue(value.value, 3 /* XSDOUBLE */);
      }
      return null;
    }
    if (isSubtypeOf(value.type, 4 /* XSDECIMAL */)) {
      if (type === 6 /* XSFLOAT */) {
        return createAtomicValue(value.value, 6 /* XSFLOAT */);
      }
      if (type === 3 /* XSDOUBLE */) {
        return createAtomicValue(value.value, 3 /* XSDOUBLE */);
      }
    }
    return null;
  }
  if (isSubtypeOf(value.type, 20 /* XSANYURI */)) {
    if (type === 1 /* XSSTRING */) {
      return createAtomicValue(value.value, 1 /* XSSTRING */);
    }
  }
  return null;
}

// ../gh/fontoxpath/src/expressions/functions/argumentHelper.ts
function mapItem(argumentItem, type, executionParameters, functionName, isReturn) {
  if (isSubtypeOf(argumentItem.type, type.type)) {
    return argumentItem;
  }
  if (isSubtypeOf(type.type, 46 /* XSANYATOMICTYPE */) && isSubtypeOf(argumentItem.type, 53 /* NODE */)) {
    argumentItem = atomizeSingleValue(argumentItem, executionParameters).first();
  }
  if (isSubtypeOf(argumentItem.type, type.type)) {
    return argumentItem;
  }
  if (type.type === 46 /* XSANYATOMICTYPE */) {
    return argumentItem;
  }
  if (isSubtypeOf(argumentItem.type, 19 /* XSUNTYPEDATOMIC */)) {
    const convertedItem = castToType(argumentItem, type.type);
    if (!convertedItem) {
      throw new Error(
        `XPTY0004 Unable to convert ${isReturn ? "return" : "argument"} of type ${valueTypeToString(argumentItem.type)} to type ${sequenceTypeToString(
          type
        )} while calling ${functionName}`
      );
    }
    return convertedItem;
  }
  const item = promoteToType(argumentItem, type.type);
  if (!item) {
    throw new Error(
      `XPTY0004 Unable to cast ${isReturn ? "return" : "argument"} of type ${valueTypeToString(argumentItem.type)} to type ${sequenceTypeToString(
        type
      )} while calling ${functionName}`
    );
  }
  return item;
}
function multiplicityToString(mult) {
  switch (mult) {
    case 2 /* ZERO_OR_MORE */:
      return "*";
    case 1 /* ONE_OR_MORE */:
      return "+";
    case 0 /* ZERO_OR_ONE */:
      return "?";
    case 3 /* EXACTLY_ONE */:
      return "";
  }
}
var performFunctionConversion = (argumentType, argument, executionParameters, functionName, isReturn) => {
  if (argumentType.mult === 0 /* ZERO_OR_ONE */) {
    return argument.switchCases({
      default: () => argument.map(
        (value) => mapItem(value, argumentType, executionParameters, functionName, isReturn)
      ),
      multiple: () => {
        throw new Error(
          `XPTY0004: Multiplicity of ${isReturn ? "function return value" : "function argument"} of type ${valueTypeToString(argumentType.type)}${multiplicityToString(
            argumentType.mult
          )} for ${functionName} is incorrect. Expected "?", but got "+".`
        );
      }
    });
  }
  if (argumentType.mult === 1 /* ONE_OR_MORE */) {
    return argument.switchCases({
      empty: () => {
        throw new Error(
          `XPTY0004: Multiplicity of ${isReturn ? "function return value" : "function argument"} of type ${valueTypeToString(argumentType.type)}${multiplicityToString(
            argumentType.mult
          )} for ${functionName} is incorrect. Expected "+", but got "empty-sequence()"`
        );
      },
      default: () => argument.map(
        (value) => mapItem(value, argumentType, executionParameters, functionName, isReturn)
      )
    });
  }
  if (argumentType.mult === 2 /* ZERO_OR_MORE */) {
    return argument.map(
      (value) => mapItem(value, argumentType, executionParameters, functionName, isReturn)
    );
  }
  return argument.switchCases({
    singleton: () => argument.map(
      (value) => mapItem(value, argumentType, executionParameters, functionName, isReturn)
    ),
    default: () => {
      throw new Error(
        `XPTY0004: Multiplicity of ${isReturn ? "function return value" : "function argument"} of type ${valueTypeToString(argumentType.type)}${multiplicityToString(
          argumentType.mult
        )} for ${functionName} is incorrect. Expected exactly one`
      );
    }
  });
};
function contextItemAsFirstArgument(functionName, parameterType, fn) {
  return (dynamicContext, executionParameters, staticContext) => {
    if (dynamicContext.contextItem === null) {
      throw errXPDY0002(
        `The function ${functionName} depends on dynamic context, which is absent.`
      );
    }
    const contextItemArgument = performFunctionConversion(
      { type: parameterType, mult: 3 /* EXACTLY_ONE */ },
      sequenceFactory_default.singleton(dynamicContext.contextItem),
      executionParameters,
      functionName,
      false
    );
    return fn(dynamicContext, executionParameters, staticContext, contextItemArgument);
  };
}

// node_modules/whynot/dist/whynot.esm.js
function t(t4, s3, r4, i4) {
  const n4 = { op: s3, func: r4, data: i4 };
  return t4.push(n4), n4;
}
function s(t4, s3) {
  return t4;
}
var r = class {
  constructor() {
    this.program = [];
  }
  test(s3, r4) {
    return t(this.program, 5, s3, void 0 === r4 ? null : r4);
  }
  jump(s3) {
    return t(this.program, 3, null, s3);
  }
  record(r4, i4) {
    return t(this.program, 4, void 0 === i4 ? s : i4, r4);
  }
  bad(s3 = 1) {
    return t(this.program, 1, null, s3);
  }
  accept() {
    return t(this.program, 0, null, null);
  }
  fail(s3) {
    return t(this.program, 2, s3 || null, null);
  }
};
var i = class _i {
  constructor(t4, s3, r4) {
    this.programLength = t4, this.maxFromByPc = s3, this.maxSurvivorFromByPc = r4;
  }
  static fromProgram(t4) {
    const s3 = t4.length, r4 = [], n4 = [];
    return t4.forEach((t5) => {
      r4.push(0), n4.push(0);
    }), t4.forEach((t5, i4) => {
      switch (t5.op) {
        case 2:
          if (null === t5.func) return;
          if (i4 + 1 >= s3) throw new Error("Invalid program: program could run past end");
          r4[i4 + 1] += 1;
          break;
        case 1:
        case 4:
          if (i4 + 1 >= s3) throw new Error("Invalid program: program could run past end");
          r4[i4 + 1] += 1;
          break;
        case 3:
          t5.data.forEach((t6) => {
            if (t6 < 0 || t6 >= s3) throw new Error("Invalid program: program could run past end");
            r4[t6] += 1;
          });
          break;
        case 5:
          if (i4 + 1 >= s3) throw new Error("Invalid program: program could run past end");
          n4[i4 + 1] += 1;
          break;
        case 0:
          n4[i4] += 1;
      }
    }), new _i(s3, r4, n4);
  }
  static createStub(t4) {
    const s3 = [], r4 = [];
    for (let i4 = 0; i4 < t4; ++i4) s3.push(t4), r4.push(t4);
    return new _i(t4, s3, r4);
  }
};
var n = class {
  constructor(t4) {
    this.acceptingTraces = t4, this.success = t4.length > 0;
  }
};
var h = class {
  constructor(t4) {
    this.t = 0, this.i = 0, this.h = new Uint16Array(t4), this.l = new Uint8Array(t4);
  }
  getBadness(t4) {
    return this.l[t4];
  }
  add(t4, s3) {
    this.l[t4] = s3 > 255 ? 255 : s3;
    const r4 = (function(t5, s4, r5, i4, n4) {
      let h3 = i4, e4 = n4;
      for (; h3 < e4; ) {
        const i5 = h3 + e4 >>> 1;
        r5 < s4[t5[i5]] ? e4 = i5 : h3 = i5 + 1;
      }
      return h3;
    })(this.h, this.l, s3, this.i, this.t);
    this.h.copyWithin(r4 + 1, r4, this.t), this.h[r4] = t4, this.t += 1;
  }
  reschedule(t4, s3) {
    const r4 = Math.max(this.l[t4], s3 > 255 ? 255 : s3);
    if (this.l[t4] !== r4) {
      const s4 = this.h.indexOf(t4, this.i);
      if (s4 < 0 || s4 >= this.t) return void (this.l[t4] = r4);
      this.h.copyWithin(s4, s4 + 1, this.t), this.t -= 1, this.add(t4, r4);
    }
  }
  getNextPc() {
    return this.i >= this.t ? null : this.h[this.i++];
  }
  reset() {
    this.t = 0, this.i = 0, this.l.fill(0);
  }
};
var e = class {
  constructor(t4) {
    this.o = [];
    let s3 = t4.length;
    t4.forEach((t5) => {
      this.o.push(t5 > 0 ? s3 : -1), s3 += t5;
    }), this.u = new Uint16Array(s3);
  }
  clear() {
    this.u.fill(0, 0, this.o.length);
  }
  add(t4, s3) {
    const r4 = this.u[s3], i4 = this.o[s3];
    this.u[s3] += 1, this.u[i4 + r4] = t4;
  }
  has(t4) {
    return this.u[t4] > 0;
  }
  forEach(t4, s3) {
    const r4 = this.u[t4], i4 = this.o[t4];
    for (let t5 = i4; t5 < i4 + r4; ++t5) s3(this.u[t5]);
  }
};
function l(t4, s3, r4 = false) {
  return null === t4 ? s3 : Array.isArray(t4) ? (-1 === t4.indexOf(s3) && (r4 && (t4 = t4.slice()), t4.push(s3)), t4) : t4 === s3 ? t4 : [t4, s3];
}
var c = class {
  constructor(t4, s3) {
    this.prefixes = t4, this.record = s3;
  }
};
function o(t4, s3) {
  let r4;
  if (null === s3) {
    if (!Array.isArray(t4)) return t4;
    r4 = t4;
  } else r4 = t4 === c.EMPTY ? [] : Array.isArray(t4) ? t4 : [t4];
  return new c(r4, s3);
}
c.EMPTY = new c([], null);
var u = class {
  constructor(t4) {
    this.p = [], this.v = [];
    for (let s3 = 0; s3 < t4; ++s3) this.p.push(0), this.v.push(null);
  }
  mergeTraces(t4, s3, r4, i4, n4, h3) {
    let e4 = false;
    return r4.forEach(s3, (s4) => {
      const r5 = this.trace(s4, i4, n4, h3);
      var c3, o3, u3;
      o3 = r5, u3 = e4, t4 = null === (c3 = t4) ? o3 : null === o3 ? c3 : Array.isArray(o3) ? o3.reduce((t5, s5) => l(t5, s5, t5 === o3), c3) : l(c3, o3, u3), e4 = t4 === r5;
    }), t4;
  }
  trace(t4, s3, r4, i4) {
    switch (this.p[t4]) {
      case 2:
        return this.v[t4];
      case 1:
        return null;
    }
    this.p[t4] = 1;
    let n4 = null;
    const h3 = s3[t4];
    if (null !== h3) n4 = h3;
    else if (!r4.has(t4)) throw new Error("Trace without source at pc " + t4);
    if (n4 = this.mergeTraces(n4, t4, r4, s3, r4, i4), null !== n4) {
      const s4 = i4[t4];
      null !== s4 && (n4 = o(n4, s4));
    }
    return this.v[t4] = n4, this.p[t4] = 2, n4;
  }
  buildSurvivorTraces(t4, s3, r4, i4, n4) {
    for (let h3 = 0, e4 = t4.length; h3 < e4; ++h3) {
      if (!r4.has(h3)) {
        s3[h3] = null;
        continue;
      }
      this.v.fill(null), this.p.fill(0);
      const e5 = this.mergeTraces(null, h3, r4, t4, i4, n4);
      if (null === e5) throw new Error("No non-cyclic paths found to survivor " + h3);
      s3[h3] = o(e5, null);
    }
    this.v.fill(null);
  }
};
var a = class {
  constructor(t4) {
    this.g = [], this.k = [], this.m = [], this.A = new e(t4.maxFromByPc), this.T = new e(t4.maxSurvivorFromByPc), this.S = new u(t4.programLength);
    for (let s3 = 0; s3 < t4.programLength; ++s3) this.g.push(null), this.k.push(null), this.m.push(null);
    this.k[0] = c.EMPTY;
  }
  reset(t4) {
    this.A.clear(), this.T.clear(), this.g.fill(null), t4 && (this.k.fill(null), this.m.fill(null), this.k[0] = c.EMPTY);
  }
  record(t4, s3) {
    this.g[t4] = s3;
  }
  has(t4) {
    return this.A.has(t4) || null !== this.k[t4];
  }
  add(t4, s3) {
    this.A.add(t4, s3);
  }
  hasSurvivor(t4) {
    return this.T.has(t4);
  }
  addSurvivor(t4, s3) {
    this.T.add(t4, s3);
  }
  buildSurvivorTraces() {
    const t4 = this.k;
    this.S.buildSurvivorTraces(t4, this.m, this.T, this.A, this.g), this.k = this.m, this.m = t4;
  }
  getTraces(t4) {
    const s3 = t4.reduce((t5, s4) => l(t5, this.k[s4]), null);
    return null === s3 ? [] : Array.isArray(s3) ? s3 : [s3];
  }
};
var f = class {
  constructor(t4) {
    this.I = [], this.N = new h(t4.programLength), this.M = new h(t4.programLength), this.P = new a(t4);
  }
  reset() {
    this.N.reset(), this.N.add(0, 0), this.I.length = 0, this.P.reset(true);
  }
  getNextThreadPc() {
    return this.N.getNextPc();
  }
  step(t4, s3, r4) {
    const i4 = this.P.has(s3);
    this.P.add(t4, s3);
    const n4 = this.N.getBadness(t4) + r4;
    i4 ? this.N.reschedule(s3, n4) : this.N.add(s3, n4);
  }
  stepToNextGeneration(t4, s3) {
    const r4 = this.P.hasSurvivor(s3);
    this.P.addSurvivor(t4, s3);
    const i4 = this.N.getBadness(t4);
    r4 ? this.M.reschedule(s3, i4) : this.M.add(s3, i4);
  }
  accept(t4) {
    this.I.push(t4), this.P.addSurvivor(t4, t4);
  }
  fail(t4) {
  }
  record(t4, s3) {
    this.P.record(t4, s3);
  }
  nextGeneration() {
    this.P.buildSurvivorTraces(), this.P.reset(false);
    const t4 = this.N;
    t4.reset(), this.N = this.M, this.M = t4;
  }
  getAcceptingTraces() {
    return this.P.getTraces(this.I);
  }
};
var d = class {
  constructor(t4) {
    this.U = [], this.G = t4, this.V = i.fromProgram(t4), this.U.push(new f(this.V));
  }
  execute(t4, s3) {
    const r4 = this.U.pop() || new f(this.V);
    r4.reset();
    const i4 = t4.length;
    let h3, e4 = -1;
    do {
      let n4 = r4.getNextThreadPc();
      if (null === n4) break;
      for (++e4, h3 = e4 >= i4 ? null : t4[e4]; null !== n4; ) {
        const t5 = this.G[n4];
        switch (t5.op) {
          case 0:
            null === h3 ? r4.accept(n4) : r4.fail(n4);
            break;
          case 2: {
            const i5 = t5.func;
            if (null === i5 || i5(s3)) {
              r4.fail(n4);
              break;
            }
            r4.step(n4, n4 + 1, 0);
            break;
          }
          case 1:
            r4.step(n4, n4 + 1, t5.data);
            break;
          case 5:
            if (null === h3) {
              r4.fail(n4);
              break;
            }
            if (!(0, t5.func)(h3, t5.data, s3)) {
              r4.fail(n4);
              break;
            }
            r4.stepToNextGeneration(n4, n4 + 1);
            break;
          case 3: {
            const s4 = t5.data, i5 = s4.length;
            if (0 === i5) {
              r4.fail(n4);
              break;
            }
            for (let t6 = 0; t6 < i5; ++t6) r4.step(n4, s4[t6], 0);
            break;
          }
          case 4: {
            const i5 = (0, t5.func)(t5.data, e4, s3);
            null != i5 && r4.record(n4, i5), r4.step(n4, n4 + 1, 0);
            break;
          }
        }
        n4 = r4.getNextThreadPc();
      }
      r4.nextGeneration();
    } while (null !== h3);
    const l3 = new n(r4.getAcceptingTraces());
    return r4.reset(), this.U.push(r4), l3;
  }
};
function w(t4) {
  const s3 = new r();
  return t4(s3), new d(s3.program);
}

// node_modules/xspattern/dist/xspattern.esm.js
function B(A2) {
  return (B2) => B2 === A2;
}
function a2(A2, B2) {
  if (null === A2 || null === B2) throw new Error("unescaped hyphen may not be used as a range endpoint");
  if (B2 < A2) throw new Error("character range is in the wrong order");
  return (a4) => A2 <= a4 && a4 <= B2;
}
function n2(A2) {
  return true;
}
function e2() {
  return false;
}
function t2(A2, B2) {
  return (a4) => A2(a4) || B2(a4);
}
function G(A2, B2) {
  switch (B2.kind) {
    case "predicate":
      return void A2.test(B2.value);
    case "regexp":
      return void r2(A2, B2.value, false);
  }
}
function i2(A2, B2) {
  B2.forEach((B3) => {
    !(function(A3, B4) {
      const [a4, { min: n4, max: e4 }] = B4;
      if (null !== e4) {
        for (let B5 = 0; B5 < n4; ++B5) G(A3, a4);
        for (let B5 = n4; B5 < e4; ++B5) {
          const B6 = A3.jump([]);
          B6.data.push(A3.program.length), G(A3, a4), B6.data.push(A3.program.length);
        }
      } else if (n4 > 0) {
        for (let B6 = 0; B6 < n4 - 1; ++B6) G(A3, a4);
        const B5 = A3.program.length;
        G(A3, a4), A3.jump([B5]).data.push(A3.program.length);
      } else {
        const B5 = A3.program.length, n5 = A3.jump([]);
        n5.data.push(A3.program.length), G(A3, a4), A3.jump([B5]), n5.data.push(A3.program.length);
      }
    })(A2, B3);
  });
}
function r2(A2, B2, a4) {
  const n4 = A2.program.length, e4 = A2.jump([]);
  a4 && (e4.data.push(A2.program.length), A2.test(() => true), A2.jump([n4]));
  const t4 = [];
  if (B2.forEach((B3) => {
    e4.data.push(A2.program.length), i2(A2, B3), t4.push(A2.jump([]));
  }), t4.forEach((B3) => {
    B3.data.push(A2.program.length);
  }), a4) {
    const B3 = A2.program.length, a5 = A2.jump([]);
    a5.data.push(A2.program.length), A2.test(() => true), A2.jump([B3]), a5.data.push(A2.program.length);
  }
}
function o2(A2, B2) {
  return { success: true, offset: A2, value: B2 };
}
function l2(A2) {
  return o2(A2, void 0);
}
function H(A2, B2, a4 = false) {
  return { success: false, offset: A2, expected: B2, fatal: a4 };
}
function C(A2) {
  return (B2, a4) => {
    const n4 = a4 + A2.length;
    return B2.slice(a4, n4) === A2 ? o2(n4, A2) : H(a4, [A2]);
  };
}
function u2(A2, B2) {
  return (a4, n4) => {
    const e4 = A2(a4, n4);
    return e4.success ? o2(e4.offset, B2(e4.value)) : e4;
  };
}
function s2(A2, B2, a4, n4) {
  return (e4, t4) => {
    const G3 = A2(e4, t4);
    return G3.success ? B2(G3.value) ? G3 : H(t4, a4, n4) : G3;
  };
}
function c2(A2, B2) {
  return (a4, n4) => {
    let e4 = null;
    for (const t4 of A2) {
      const A3 = t4(a4, n4);
      if (A3.success) return A3;
      if (null === e4 || A3.offset > e4.offset ? e4 = A3 : A3.offset === e4.offset && void 0 === B2 && (e4.expected = e4.expected.concat(A3.expected)), A3.fatal) return A3;
    }
    return B2 = B2 || (null == e4 ? void 0 : e4.expected) || [], e4 && (e4.expected = B2), e4 || H(n4, B2);
  };
}
function D(A2) {
  return (B2, a4) => {
    const n4 = A2(B2, a4);
    return n4.success || n4.fatal ? n4 : o2(a4, null);
  };
}
function m(A2) {
  return (B2, a4) => {
    let n4 = [], e4 = a4;
    for (; ; ) {
      const a5 = A2(B2, e4);
      if (!a5.success) {
        if (a5.fatal) return a5;
        break;
      }
      if (n4.push(a5.value), a5.offset === e4) break;
      e4 = a5.offset;
    }
    return o2(e4, n4);
  };
}
function I(A2, B2, a4) {
  return (n4, e4) => {
    const t4 = A2(n4, e4);
    if (!t4.success) return t4;
    const G3 = B2(n4, t4.offset);
    return G3.success ? o2(G3.offset, a4(t4.value, G3.value)) : G3;
  };
}
function d2(A2) {
  return I(A2, m(A2), (A3, B2) => [A3].concat(B2));
}
function h2(A2, B2) {
  return A2;
}
function p(A2, B2) {
  return B2;
}
function T(A2, B2) {
  return I(A2, B2, p);
}
function F(A2, B2) {
  return I(A2, B2, h2);
}
function E(A2, B2, a4, n4 = false) {
  return T(A2, n4 ? f2(F(B2, a4)) : F(B2, a4));
}
function g(A2, B2) {
  return (a4, n4) => A2(a4, n4).success ? H(n4, B2) : l2(n4);
}
function f2(A2) {
  return (B2, a4) => {
    const n4 = A2(B2, a4);
    return n4.success ? n4 : H(n4.offset, n4.expected, true);
  };
}
var P = (A2, B2) => A2.length === B2 ? l2(B2) : H(B2, ["end of input"]);
var M = ["Lu", "Ll", "Lt", "Lm", "Lo", "Mn", "Mc", "Me", "Nd", "Nl", "No", "Pc", "Pd", "Ps", "Pe", "Pi", "Pf", "Po", "Zs", "Zl", "Zp", "Sm", "Sc", "Sk", "So", "Cc", "Cf", "Co", "Cn"];
var J = {};
function S(A2) {
  return A2.codePointAt(0);
}
"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("").forEach((A2, B2) => {
  J[A2] = B2;
});
var K = (A2) => -1 === A2 || -2 === A2;
function b(A2) {
  return (B2) => !K(B2) && !A2(B2);
}
function y(A2, B2) {
  return null === B2 ? A2 : (a4) => A2(a4) && !B2(a4);
}
var Q = (function(A2, B2) {
  const n4 = /* @__PURE__ */ new Map();
  let e4 = 0;
  return A2.forEach((A3, G3) => {
    const i4 = B2[G3];
    null !== A3 && A3.split("|").forEach((A4) => {
      const B3 = n4.get(A4), G4 = a2(e4, e4 + i4 - 1);
      n4.set(A4, B3 ? t2(B3, G4) : G4);
    }), e4 += i4;
  }), n4;
})(["BasicLatin", "Latin-1Supplement", "LatinExtended-A", "LatinExtended-B", "IPAExtensions", "SpacingModifierLetters", "CombiningDiacriticalMarks", "GreekandCoptic|Greek", "Cyrillic", "CyrillicSupplement", "Armenian", "Hebrew", "Arabic", "Syriac", "ArabicSupplement", "Thaana", "NKo", "Samaritan", "Mandaic", "SyriacSupplement", "ArabicExtended-B", "ArabicExtended-A", "Devanagari", "Bengali", "Gurmukhi", "Gujarati", "Oriya", "Tamil", "Telugu", "Kannada", "Malayalam", "Sinhala", "Thai", "Lao", "Tibetan", "Myanmar", "Georgian", "HangulJamo", "Ethiopic", "EthiopicSupplement", "Cherokee", "UnifiedCanadianAboriginalSyllabics", "Ogham", "Runic", "Tagalog", "Hanunoo", "Buhid", "Tagbanwa", "Khmer", "Mongolian", "UnifiedCanadianAboriginalSyllabicsExtended", "Limbu", "TaiLe", "NewTaiLue", "KhmerSymbols", "Buginese", "TaiTham", "CombiningDiacriticalMarksExtended", "Balinese", "Sundanese", "Batak", "Lepcha", "OlChiki", "CyrillicExtended-C", "GeorgianExtended", "SundaneseSupplement", "VedicExtensions", "PhoneticExtensions", "PhoneticExtensionsSupplement", "CombiningDiacriticalMarksSupplement", "LatinExtendedAdditional", "GreekExtended", "GeneralPunctuation", "SuperscriptsandSubscripts", "CurrencySymbols", "CombiningDiacriticalMarksforSymbols|CombiningMarksforSymbols", "LetterlikeSymbols", "NumberForms", "Arrows", "MathematicalOperators", "MiscellaneousTechnical", "ControlPictures", "OpticalCharacterRecognition", "EnclosedAlphanumerics", "BoxDrawing", "BlockElements", "GeometricShapes", "MiscellaneousSymbols", "Dingbats", "MiscellaneousMathematicalSymbols-A", "SupplementalArrows-A", "BraillePatterns", "SupplementalArrows-B", "MiscellaneousMathematicalSymbols-B", "SupplementalMathematicalOperators", "MiscellaneousSymbolsandArrows", "Glagolitic", "LatinExtended-C", "Coptic", "GeorgianSupplement", "Tifinagh", "EthiopicExtended", "CyrillicExtended-A", "SupplementalPunctuation", "CJKRadicalsSupplement", "KangxiRadicals", null, "IdeographicDescriptionCharacters", "CJKSymbolsandPunctuation", "Hiragana", "Katakana", "Bopomofo", "HangulCompatibilityJamo", "Kanbun", "BopomofoExtended", "CJKStrokes", "KatakanaPhoneticExtensions", "EnclosedCJKLettersandMonths", "CJKCompatibility", "CJKUnifiedIdeographsExtensionA", "YijingHexagramSymbols", "CJKUnifiedIdeographs", "YiSyllables", "YiRadicals", "Lisu", "Vai", "CyrillicExtended-B", "Bamum", "ModifierToneLetters", "LatinExtended-D", "SylotiNagri", "CommonIndicNumberForms", "Phags-pa", "Saurashtra", "DevanagariExtended", "KayahLi", "Rejang", "HangulJamoExtended-A", "Javanese", "MyanmarExtended-B", "Cham", "MyanmarExtended-A", "TaiViet", "MeeteiMayekExtensions", "EthiopicExtended-A", "LatinExtended-E", "CherokeeSupplement", "MeeteiMayek", "HangulSyllables", "HangulJamoExtended-B", "HighSurrogates", "HighPrivateUseSurrogates", "LowSurrogates", "PrivateUseArea|PrivateUse", "CJKCompatibilityIdeographs", "AlphabeticPresentationForms", "ArabicPresentationForms-A", "VariationSelectors", "VerticalForms", "CombiningHalfMarks", "CJKCompatibilityForms", "SmallFormVariants", "ArabicPresentationForms-B", "HalfwidthandFullwidthForms", "Specials", "LinearBSyllabary", "LinearBIdeograms", "AegeanNumbers", "AncientGreekNumbers", "AncientSymbols", "PhaistosDisc", null, "Lycian", "Carian", "CopticEpactNumbers", "OldItalic", "Gothic", "OldPermic", "Ugaritic", "OldPersian", null, "Deseret", "Shavian", "Osmanya", "Osage", "Elbasan", "CaucasianAlbanian", "Vithkuqi", null, "LinearA", "LatinExtended-F", null, "CypriotSyllabary", "ImperialAramaic", "Palmyrene", "Nabataean", null, "Hatran", "Phoenician", "Lydian", null, "MeroiticHieroglyphs", "MeroiticCursive", "Kharoshthi", "OldSouthArabian", "OldNorthArabian", null, "Manichaean", "Avestan", "InscriptionalParthian", "InscriptionalPahlavi", "PsalterPahlavi", null, "OldTurkic", null, "OldHungarian", "HanifiRohingya", null, "RumiNumeralSymbols", "Yezidi", "ArabicExtended-C", "OldSogdian", "Sogdian", "OldUyghur", "Chorasmian", "Elymaic", "Brahmi", "Kaithi", "SoraSompeng", "Chakma", "Mahajani", "Sharada", "SinhalaArchaicNumbers", "Khojki", null, "Multani", "Khudawadi", "Grantha", null, "Newa", "Tirhuta", null, "Siddham", "Modi", "MongolianSupplement", "Takri", null, "Ahom", null, "Dogra", null, "WarangCiti", "DivesAkuru", null, "Nandinagari", "ZanabazarSquare", "Soyombo", "UnifiedCanadianAboriginalSyllabicsExtended-A", "PauCinHau", "DevanagariExtended-A", null, "Bhaiksuki", "Marchen", null, "MasaramGondi", "GunjalaGondi", null, "Makasar", "Kawi", null, "LisuSupplement", "TamilSupplement", "Cuneiform", "CuneiformNumbersandPunctuation", "EarlyDynasticCuneiform", null, "Cypro-Minoan", "EgyptianHieroglyphs", "EgyptianHieroglyphFormatControls", null, "AnatolianHieroglyphs", null, "BamumSupplement", "Mro", "Tangsa", "BassaVah", "PahawhHmong", null, "Medefaidrin", null, "Miao", null, "IdeographicSymbolsandPunctuation", "Tangut", "TangutComponents", "KhitanSmallScript", "TangutSupplement", null, "KanaExtended-B", "KanaSupplement", "KanaExtended-A", "SmallKanaExtension", "Nushu", null, "Duployan", "ShorthandFormatControls", null, "ZnamennyMusicalNotation", null, "ByzantineMusicalSymbols", "MusicalSymbols", "AncientGreekMusicalNotation", null, "KaktovikNumerals", "MayanNumerals", "TaiXuanJingSymbols", "CountingRodNumerals", null, "MathematicalAlphanumericSymbols", "SuttonSignWriting", null, "LatinExtended-G", "GlagoliticSupplement", "CyrillicExtended-D", null, "NyiakengPuachueHmong", null, "Toto", "Wancho", null, "NagMundari", null, "EthiopicExtended-B", "MendeKikakui", null, "Adlam", null, "IndicSiyaqNumbers", null, "OttomanSiyaqNumbers", null, "ArabicMathematicalAlphabeticSymbols", null, "MahjongTiles", "DominoTiles", "PlayingCards", "EnclosedAlphanumericSupplement", "EnclosedIdeographicSupplement", "MiscellaneousSymbolsandPictographs", "Emoticons", "OrnamentalDingbats", "TransportandMapSymbols", "AlchemicalSymbols", "GeometricShapesExtended", "SupplementalArrows-C", "SupplementalSymbolsandPictographs", "ChessSymbols", "SymbolsandPictographsExtended-A", "SymbolsforLegacyComputing", null, "CJKUnifiedIdeographsExtensionB", null, "CJKUnifiedIdeographsExtensionC", "CJKUnifiedIdeographsExtensionD", "CJKUnifiedIdeographsExtensionE", "CJKUnifiedIdeographsExtensionF", null, "CJKCompatibilityIdeographsSupplement", null, "CJKUnifiedIdeographsExtensionG", "CJKUnifiedIdeographsExtensionH", null, "Tags", null, "VariationSelectorsSupplement", null, "SupplementaryPrivateUseArea-A|PrivateUse", "SupplementaryPrivateUseArea-B|PrivateUse"], [128, 128, 128, 208, 96, 80, 112, 144, 256, 48, 96, 112, 256, 80, 48, 64, 64, 64, 32, 16, 48, 96, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 256, 160, 96, 256, 384, 32, 96, 640, 32, 96, 32, 32, 32, 32, 128, 176, 80, 80, 48, 96, 32, 32, 144, 80, 128, 64, 64, 80, 48, 16, 48, 16, 48, 128, 64, 64, 256, 256, 112, 48, 48, 48, 80, 64, 112, 256, 256, 64, 32, 160, 128, 32, 96, 256, 192, 48, 16, 256, 128, 128, 256, 256, 96, 32, 128, 48, 80, 96, 32, 128, 128, 224, 16, 16, 64, 96, 96, 48, 96, 16, 32, 48, 16, 256, 256, 6592, 64, 20992, 1168, 64, 48, 320, 96, 96, 32, 224, 48, 16, 64, 96, 32, 48, 48, 32, 96, 32, 96, 32, 96, 32, 48, 64, 80, 64, 11184, 80, 896, 128, 1024, 6400, 512, 80, 688, 16, 16, 16, 32, 32, 144, 240, 16, 128, 128, 64, 80, 64, 48, 128, 32, 64, 32, 48, 32, 48, 32, 64, 32, 80, 48, 48, 80, 48, 64, 80, 64, 384, 64, 64, 64, 32, 32, 48, 48, 32, 32, 32, 64, 32, 96, 96, 32, 32, 32, 64, 64, 32, 32, 48, 80, 80, 48, 128, 64, 288, 32, 64, 64, 48, 64, 64, 48, 32, 128, 80, 48, 80, 48, 96, 32, 80, 48, 48, 80, 128, 128, 128, 96, 160, 128, 96, 32, 80, 48, 80, 176, 80, 80, 96, 96, 64, 96, 80, 96, 16, 64, 96, 160, 112, 80, 64, 96, 80, 304, 32, 96, 80, 16, 64, 1024, 128, 208, 2624, 112, 1072, 48, 4e3, 640, 8576, 576, 48, 96, 48, 144, 688, 96, 96, 160, 64, 32, 6144, 768, 512, 128, 8816, 16, 256, 48, 64, 400, 2304, 160, 16, 4688, 208, 48, 256, 256, 80, 112, 32, 32, 96, 32, 128, 1024, 688, 1104, 256, 48, 96, 112, 80, 320, 48, 64, 464, 48, 736, 32, 224, 32, 96, 784, 80, 64, 80, 176, 256, 256, 48, 112, 96, 256, 256, 768, 80, 48, 128, 128, 128, 256, 256, 112, 144, 256, 1024, 42720, 32, 4160, 224, 5776, 7488, 3088, 544, 1504, 4944, 4192, 711760, 128, 128, 240, 65040, 65536, 65536]);
var x = (function(A2) {
  const n4 = /* @__PURE__ */ new Map(), G3 = A2.split(""), i4 = M.map(() => []);
  let r4 = 0, o3 = 0;
  for (; o3 < G3.length; ) {
    const A3 = J[G3[o3]], n5 = (31 & A3) - 2;
    let e4 = 1 + J[G3[o3 + 1]];
    switch (32 & A3 ? (e4 += J[G3[o3 + 2]] << 6, e4 += J[G3[o3 + 3]] << 12, e4 += J[G3[o3 + 4]] << 18, o3 += 5) : o3 += 2, n5) {
      case -2: {
        let A4 = 0;
        for (let a4 = r4; a4 < r4 + e4; ++a4) {
          i4[A4].push(B(a4)), A4 = (A4 + 1) % 2;
        }
        break;
      }
      case -1:
        break;
      default: {
        const A4 = i4[n5];
        1 === e4 ? A4.push(B(r4)) : A4.push(a2(r4, r4 + e4 - 1));
        break;
      }
    }
    r4 += e4;
  }
  const l3 = /* @__PURE__ */ new Map();
  return M.forEach((A3, B2) => {
    const a4 = i4[B2].reduce(t2, e2);
    n4.set(A3, a4);
    const G4 = A3.charAt(0), r5 = l3.get(G4) || [];
    l3.set(G4, r5), r5.push(a4);
  }), l3.forEach((A3, B2) => {
    n4.set(B2, A3.reduce(t2, e2));
  }), n4;
})("bfUATCYATCPAQATAXATAOATBKJTBXCTBCZPATAQAZANAZADZPAXAQAXAbgUATAYDaATAZAaAGARAXAcAaAZAaAXAMBZADATBZAMAGASAMCTACWXACGDXXADHA3DAAPDAAtCAAFDBCAADCAABCCDBCCABCAABCCDCCAABCAAFCAADDAABCAABCBADCBDBGACADCGDCAEADACAEADACAEADAAPDAARDACAEADAABCBA7DFCAABCBDBABCCAJjDBAAGADaFRZDFLZNFEZGFAZAFAZQnvBAAADFAZACADABBFADCTACABDZBCATACCBACABACAABCQBACIDiCADBCCDCAXDDCADAXAABCBDBCyDvAhaAHEJBA1CAANDAgfBAABAClBBFATFDoTAOABBaBYABAHsOAHATAHBTAHBTAHABHGaBDGDTBBKcFXCTBYATBaBHKTAcATCGfFAGJHUKJTDGBHAmiBAATAGAHGcAaAHFFBHBaAHDGBKJGCaBGATNBAcAGAHAGdHaBBmYBAAHKGABNKJGgHIFBaATCFABBHAYBGVHDFAHIFAHCFAHEBBTOBAGYHCBBTABAGKBEGXZAGFBAcBBFHHGoFAHXcAHfIAG1HAIAHAGAICHHIDHAIBGAHGGJHBTBKJTAFAGOHAIBBAGHBBGBBBGVBAGGBAGABCGDBBHAGAICHDBBIBBBIBHAGABHIABDGBBAGCHBBBKJGBYBMFaAYAGATAHABBHBIABAGFBDGBBBGVBAGGBAGBBAGBBAGBBBHABAICHBBDHBBBHCBCHABGGDBAGABGKJHBGCHATABJHBIABAGIBAGCBAGVBAGGBAGBBAGEBBHAGAICHEBAHBIABAIBHABBGABOGBHBBBKJTAYABGGAHFBAHAIBBAGHBBGBBBGVBAGGBAGBBAGEBBHAGAIAHAIAHDBBIBBBIBHABGHBIABDGBBAGCHBBBKJaAGAMFBJHAGABAGFBCGCBAGDBCGBBAGABAGBBCGBBCGCBCGLBDIBHAIBBCICBAICHABBGABFIABNKJMCaFYAaABEHAICHAGHBAGCBAGWBAGPBBHAGAHCIDBAHCBAHDBGHBBAGCBBGABBGBHBBBKJBGTAMGaAGAHAIBTAGHBAGCBAGWBAGJBAGEBBHAGAIAHAIEBAHAIBBAIBHBBGIBBFGBBAGBHBBBKJBAGBIABLHBIBGIBAGCBAGoHBGAICHDBAICBAICHAGAaABDGCIAMGGCHBBBKJMIaAGFBAHAIBBAGRBCGXBAGIBAGABBGGBCHABDICHCBAHABAIHBFKJBBIBTABLGvHAGBHGBDYAGFFAHHTAKJTBBkGBBAGABAGEBAGXBAGABAGJHAGBHIGABBGEBAFABAHGBAKJBBGDBfGAaCTOaATAaCHBaFKJMJaAHAaAHAaAHAPAQAPAQAIBGHBAGjBDHNIAHETAHBGEHKBAHjBAaHHAaFBAaBTEaDTBBkGqIBHDIAHFIAHBIBHBGAKJTFGFIBHBGDHCGAICGBIGGCHDGMHAIBHBIFHAGAIAKJICHAaBClBACABECABBDqTAFADCmIFAABAGDBBGGBAGABAGDBBGoBAGDBBGgBAGDBBGGBAGABAGDBBGOBAG4BAGDBBmCBAABBHCTIMTBCGPaJBFiVBAABBDFBBOAmrJAAaATAGQUAGZPAQABCmKBAATCLCGHBGGRHCIABIGSHBIATBBIGRHBBLGMBAGCBAHBBLGzHBIAHGIHHAIBHKTCFATCYAGAHABBKJBFMJBFTFOATDHCcAHAKJBFGiFAG0BGGEHBGhHAGABEmFBAABJGeBAHCIDHBICBDIBHAIFHCBDaABCTBKJGdBBGEBKGrBDGZBFKJMABCahGWHBIBHABBTBG0IAHAIAHGBAHAIAHAIBHHIFHJBBHAKJBFKJBFTGFATFBBHNJAHPBwHDIAGuHAIAHEIAHAIEHAIBGHBCKJTGaJHIaITBBAHBIAGdIAHDIBHBIAHCGBKJGrHAIAHBICHAIAHCIBBHTDGjIHHHIBHBBCTEKJBCGCKJGdFFTBDIBGCqBBCCTHBHHCTAHMIAHGGDHAGFHAGBIAHBGABEDrF+DMFADhFkH/gVCAADHghBAADHCHDFBBCFBBDHCHDHCHDFBBCFBBDHBACABACABACABACADHCHDNBBDHEHDHEHDHEHDEBADBCDEAZADAZCDCBADBCDEAZCDDBBDBCDBAZCDHCEZCBBDCBADBCDEAZBBAUKcEOFTBRASAPARBSAPARATHVAWAcEUATIRASATDNBTCXAPAQATKXATANATJUAcEBAcJMAFABBMFXCPAQAFAMJXCPAQABAFMBCYgBOHMJDHAJCHLBOaBCAaDCAaBDACCDBCCDAaACAaBXACEaFCAaACAaACAaACDaADACDDAGDDAaBDBCBXECADDaAXAaBDAaAMPLiCADALDMAaBBDXEaEXBaDXAaBXAaBXAaGXAaeXBaBXAaAXAae3LEAAaHPAQAPAQAaTXBaGPAQA6QBAAXAadXYanXF6EBAABYaKBUM76NBAAMV62CAAXAaIXAa1XH6uBAAXA63DAAPAQAPAQAPAQAPAQAPAQAPAQAPAQAMdarXEPAQAXePAQAPAQAPAQAPAQAPAQAXP6/DAA3CCAAPAQAPAQAPAQAPAQAPAQAPAQAPAQAPAQAPAQAPAQAPAQAX+PAQAPAQAXfPAQA3BEAAavXUaBXFamBBafBA6oBAACvDvABCCDBAFCCADDACADFFBCBgjBAADAaFADHCCADABETDMATBDlBADABEDABBG3BGFATABNHAGWBIGGBAGGBAGGBAGGBAGGBAGGBAGGBAGGBAHfTBRASARASATCRASATARASATIOATBOATARASATBRASAPAQAPAQAPAQAPAQATEFATJOBTDOATAPATMaBTCPAQAPAQAPAQAPAQAOABhaZBA6YBAABL6VDAABZaLBDUATCaAFAGALAPAQAPAQAPAQAPAQAPAQAaBPAQAPAQAPAQAPAQAOAPAQBaALIHDIBOAFEaBLCFAGATAaBBAmVBAABBHBZBFBGAOAmZBAATAFCGABEGqBAmdBAABAaBMDaJGfajBLGPaeBAMJadMHaAMOafMJamMO6/EAAm/mBAa/mUIFAFAm2RAABCa2BIGnFFTBmLEAAFATCGPKJGBBTAtGAHAJCTAHJTAFAAbFBHBmFBAALJHBTFBHZWFIZBANDBA9FADHADCAAJFAZBADGAADDBATCDABCDAPCCADBECADABADABADAADBXFCCADAGAFBDAGGHAGCHAGDHAGWIBHBIAaDHABCMFaBYAaABFGzTDBHIBGxIPHBBHTBKJBFHRGFTCGATAGBHAKJGbHHTBGWHKIBBKTAGcBCHCIAGuHAIBHDIBHBICTMBAFAKJBDTBGEHAFAGIKJGEBAGoHFIBHBIBHBBIGCHAGHHAIABBKJBBTDGPFAGFaCGAIAHAIAGxHAGAHCGBHBGEHBGAHAGABXGBFATBGKIAHBIBTBGAFBIAHABJGFBBGFBBGFBIGGBAGGBADqZAFDDIFAZBBDjPBAAGiIBHAIBHAIBTAIAHABBKJBFmjuCABLGWBDGwhDgAA9/jBAmtFAABBmpBAABlDGBLDEBEGAHAGJXAGMBAGEBAGABAGBBAGBBAmrBAAZQBPmqFAAQAPAaPG/BBG1BGaABfGLYAaCHPTGPAQATABFHPTAOBNBPAQAPAQAPAQAPAQAPAQAPAQAPAQAPAQATBPAQATDNCTCBATDOAPAQAPAQAPAQATCXAOAXCBATAYATBBDGEBAmGCAABBcABATCYATCPAQATAXATAOATBKJTBXCTBCZPATAQAZANAZADZPAXAQAXAPAQATAPAQATBGJFAGsFBGeBCGFBBGFBBGFBBGCBCYBXAZAaAYBBAaAXDaBBJcCaBBBGLBAGZBAGSBAGBBAGOBBGNBhm6BAABETCBDMsBCaIL0MDaQMBaCBAaMBCaABuasHAhBCAAGcBCGwBOHAMaBDGfMDBIGTLAGHLABEGlHEBEGdBATAGjBDGHTALEBpCnDnmNBAABBKJBFCjBDDjBDGnBHGzBKTACKBACOBACGBACBBADKBADOBADGBADBhCBAAm2EAABIGVBJGHBXFFBAFpBAFIhEBAAGFBBGABAGrBAGBBCGABBGWBATAMHGWaBMGGeBHMIBvGSBAGBBEMEGVMFBCTAGZBETAB/G3BDMBGBMPBBMtGAHCBAHBBEHDGDBAGCBAGcBBHCBDHAMIBGTIBGGcMBTAGcMCBfGHaAGbHBBDMETGBIG1BCTGGVBBMHGSBEMHGRBGTDBLMGhPBAAmIBAAB2CyBMDyBGMFGjHDBHKJhlEAAMeBAGpBAHBOABBGBhKBAAHCGcMJGABHGVHKMDTEBVGRHDTDBlGUMGBTGWBIIAHAIAG0HOTGBDMTKJHAGBHBGABIHCIAGsICHDIBHBTBcATDHABJcABBGYBGKJBFHCGjHEIAHHBAKJTDGAIBGABHGiHATBGABIHBIAGvICHIIBGDTDHDTAIAHAKJGATAGATCBAMTBKGRBAGYICHCIBHAIAHBTFHAGBHAB9GGBAGABAGDBAGOBAGJTABFGuHAICHHBEKJBFHBIBBAGHBBGBBBGVBAGGBAGBBAGEBAHBGAIBHAIDBBIBBBICBBGABFIABEGEIBBBHGBCHEhKCAAG0ICHHIBHCIAHAGDTEKJTBBATAHAGCBdGvICHFIAHAIDHBIAHBGBTAGABHKJhlCAAGuICHDBBIDHBIAHBTWGDHBBhGvICHHIBHAIAHBTCGABKKJBFTMBSGqHAIAHAIBHFIAHAGATABFKJB1GaBBHCIBHDIAHEBDKJMBTCaAGGh4CAAGrICHIIAHBTAhjBAACfDfKJMIBLGHBBGABBGHBAGBBAGXIFBAIBBBHBIAHAGAIAGAIAHATCBIKJhFBAAGHBBGmICHDBBHBIDHAGATAGAIABaGAHJGnHFIAGAHDTHHABHGAHFIBHCGtHMIAHBTCGATEBMmIBAABGTJh1DAAGIBAGkIAHGBAHFIAHAGATEBJKJMSBCTBGdBBHVBAIAHGIAHBIAHBhIBAAGGBAGBBAGlHFBCHABAHBBAHGGAHABHKJBFGFBAGBBAGfIEBAHBBAIBHAIAHAGABGKJh1EAAGSHBIBTBBGHBGAIAGMBAGhIBHEBCIBHAIAHATMKJhVBAAGABOMUaHYDaQBMTAmZOAAhlBAAruBAABATEBKmDDAAhLpAAmgBAATBBMmvQAAcPHAGFHOhp+AAmGJAAh4GCAm4IAABGGeBAKJBDTBmOBAABAKJBFGdBBHETABJGvHGTEaDFDTAaABJKJBAMGBAGUBEGShvKAACfDfMWTDhkBAAmKBAABDHAGAI2BGHDFMB/FBTAFAHABKIBBNm3fBABHmVTAABpGIhmLCAFDBAFGBAFBBAmiEAABOGABcGCBBGABNGDBHmLGAAhDkAAmqBAABEGMBCGIBGGJBBaAHBTAcDhbJBAHtBBHWBI6zBAAB761DAABJamBBa7IBHCaCIFcHHHaBHGadHDa8BU6BBAAHCaAh5BAAMTBLMTBL6WBAABIMYhGCAACZDZCZDGBADRCZDZCABACBBBCABBCBBBCDBACHDDBADABADGBADKCZDZCBBACDBBCHBACGBADZCBBACDBACEBACABCCGBADZCZDZCZDZCZDZCZDZCZDZCZDbBBCYXADYXADFCYXADYXADFCYXADYXADFCYXADYXADFCYXADYXADFCADABBKx6/HAAH2aDHxaHHAaNHAaBTEBOHEBAHOhPRAADJGADTBFDFhUDAAHGBAHQBBHGBAHBBAHEBEF9BgHAhvBAAGsBCHGFGBBKJBDGAaAh/EAAGdHABQGrHDKJBEYAhPHAAGaFAHDKJhlLAAGGBAGDBAGBBAGOBAmEDAABBMIHGBoChDhHGFABDKJBDTBhQMAAM6aAMCYAMDhLBAAMsaAMOhBDAAGDBAGaBAGBBAGABBGABAGJBAGDBAGABAGABFGABDGABAGABAGABAGCBAGBBAGABBGABAGABAGABAGABAGABAGBBAGABBGDBAGGBAGDBAGDBAGABAGJBAGQBEGCBAGEBAGQBzXBhNEAAarBD6jBAABLaOBBaOBAaOBAakBJMM6gCAAB3acBMarBDaIBGaBBNaFhZCAA66DAAZE6XLAABDaQBCaMBC62BAABD6eBAABFaLBDaABOaLBDa3BHaJBFanBHadBBaBhNBAA6TFAABLaNBBaMBCaIBGatBAaGBHaNBDaIBGaIBG6SCAABAa2BkKJhFQAAmfbKABfm5ABABFmdDAABBmBaBABNmw0BAhewAAmdIAAhhXAAmKNBABEmfBBAhQxtCcABd8fBAAh/BAAnvDAAhP4PA99/PABB99/PA");
function L(A2) {
  return 32 === A2 || 9 === A2 || 10 === A2 || 13 === A2;
}
var X = [B(S(":")), a2(S("A"), S("Z")), B(S("_")), a2(S("a"), S("z")), a2(192, 214), a2(216, 246), a2(192, 214), a2(216, 246), a2(248, 767), a2(880, 893), a2(895, 8191), a2(8204, 8205), a2(8304, 8591), a2(11264, 12271), a2(12289, 55295), a2(63744, 64975), a2(65008, 65533), a2(65536, 983039)].reduce(t2);
var Z = [X, B(S("-")), B(S(".")), a2(S("0"), S("9")), B(183), a2(768, 879), a2(8255, 8256)].reduce(t2);
var O = x.get("Nd");
var k = b(O);
var N = y(a2(0, 1114111), [x.get("P"), x.get("Z"), x.get("C")].reduce(t2));
var v = b(N);
function w2(A2) {
  return 10 !== A2 && 13 !== A2 && !K(A2);
}
var Y = { s: L, S: b(L), i: X, I: b(X), c: Z, C: b(Z), d: O, D: k, w: N, W: v };
var U = C("*");
var j = C("\\");
var R = C("{");
var V = C("}");
var W = C("[");
var q = C("]");
var z = C("^");
var $ = C("$");
var _ = C(",");
var AA = C("-");
var BA = C("(");
var aA = C(")");
var nA = C(".");
var eA = C("|");
var tA = C("+");
var GA = C("?");
var iA = C("-[");
var rA = S("0");
function oA(A2) {
  function e4(A3) {
    return new Set(A3.split("").map((A4) => S(A4)));
  }
  function G3(A3, B2) {
    const a4 = A3.codePointAt(B2);
    return void 0 === a4 ? H(B2, ["any character"]) : o2(B2 + String.fromCodePoint(a4).length, a4);
  }
  const i4 = "xpath" === A2.language ? T(j, c2([u2(C("n"), () => 10), u2(C("r"), () => 13), u2(C("t"), () => 9), u2(c2([j, eA, nA, AA, z, GA, U, tA, R, V, $, BA, aA, W, q]), (A3) => S(A3))])) : T(j, c2([u2(C("n"), () => 10), u2(C("r"), () => 13), u2(C("t"), () => 9), u2(c2([j, eA, nA, AA, z, GA, U, tA, R, V, BA, aA, W, q]), (A3) => S(A3))]));
  function r4(A3, B2) {
    const a4 = e4(B2);
    return I(C(A3), D(s2(G3, (A4) => a4.has(A4), B2.split(""))), (A4, B3) => (function(A5) {
      const B4 = x.get(A5);
      if (null == B4) throw new Error(A5 + " is not a valid unicode category");
      return B4;
    })(null === B3 ? A4 : A4 + String.fromCodePoint(B3)));
  }
  const l3 = c2([r4("L", "ultmo"), r4("M", "nce"), r4("N", "dlo"), r4("P", "cdseifo"), r4("Z", "slp"), r4("S", "mcko"), r4("C", "cfon")]), p3 = [a2(S("a"), S("z")), a2(S("A"), S("Z")), a2(S("0"), S("9")), B(45)].reduce(t2), M2 = c2([l3, u2(T(C("Is"), /* @__PURE__ */ (function(A3) {
    return (B2, a4) => {
      const n4 = A3(B2, a4);
      return n4.success ? o2(n4.offset, B2.slice(a4, n4.offset)) : n4;
    };
  })(d2(s2(G3, p3, ["block identifier"])))), (B2) => (function(A3, B3) {
    const a4 = Q.get(A3);
    if (void 0 === a4) {
      if (B3) return n2;
      throw new Error(`The unicode block identifier "${A3}" is not known.`);
    }
    return a4;
  })(B2, "xpath" !== A2.language))]), J2 = E(C("\\p{"), M2, V, true), K2 = u2(E(C("\\P{"), M2, V, true), b), L2 = T(j, u2(c2("sSiIcCdDwW".split("").map((A3) => C(A3))), (A3) => Y[A3])), X2 = u2(nA, () => w2), Z2 = c2([L2, J2, K2]), O2 = e4("\\[]"), k2 = c2([i4, s2(G3, (A3) => !O2.has(A3), ["unescaped character"])]), N2 = c2([u2(AA, () => null), k2]), v3 = I(N2, T(AA, N2), a2);
  function oA2(A3, B2) {
    return [A3].concat(B2 || []);
  }
  const lA2 = u2(/* @__PURE__ */ (function(A3) {
    return (B2, a4) => {
      const n4 = A3(B2, a4);
      return n4.success ? o2(a4, n4.value) : n4;
    };
  })(c2([q, iA])), () => null), HA2 = S("-"), CA = c2([u2(F(F(AA, g(W, ["not ["])), lA2), () => HA2), T(g(AA, ["not -"]), k2)]), uA = c2([I(u2(CA, B), c2([function(A3, B2) {
    return uA(A3, B2);
  }, lA2]), oA2), I(c2([v3, Z2]), c2([cA, lA2]), oA2)]);
  const sA = c2([I(u2(k2, B), c2([uA, lA2]), oA2), I(c2([v3, Z2]), c2([cA, lA2]), oA2)]);
  function cA(A3, B2) {
    return sA(A3, B2);
  }
  const DA = u2(sA, (A3) => A3.reduce(t2)), mA = u2(T(z, DA), b), IA = I(c2([T(g(z, ["not ^"]), DA), mA]), D(T(AA, (function(A3, B2) {
    return dA(A3, B2);
  }))), y), dA = E(W, IA, q, true);
  const hA = "xpath" === A2.language ? c2([u2(i4, B), Z2, dA, X2, u2(z, () => (A3) => -1 === A3), u2($, () => (A3) => -2 === A3)]) : c2([u2(i4, B), Z2, dA, X2]), pA = "xpath" === A2.language ? e4(".\\?*+{}()|^$[]") : e4(".\\?*+{}()|[]"), TA = s2(G3, (A3) => !pA.has(A3), ["NormalChar"]), FA = u2(T(j, I(u2(s2(G3, a2(S("1"), S("9")), ["digit"]), (A3) => A3 - rA), m(u2(s2(G3, a2(rA, S("9")), ["digit"]), (A3) => A3 - rA)), (A3, B2) => {
    B2.reduce((A4, B3) => 10 * A4 + B3, A3);
  })), (A3) => {
    throw new Error("Backreferences in XPath patterns are not yet implemented.");
  }), EA = "xpath" === A2.language ? c2([u2(TA, (A3) => ({ kind: "predicate", value: B(A3) })), u2(hA, (A3) => ({ kind: "predicate", value: A3 })), u2(E(BA, T(D(C("?:")), SA), aA, true), (A3) => ({ kind: "regexp", value: A3 })), FA]) : c2([u2(TA, (A3) => ({ kind: "predicate", value: B(A3) })), u2(hA, (A3) => ({ kind: "predicate", value: A3 })), u2(E(BA, SA, aA, true), (A3) => ({ kind: "regexp", value: A3 }))]), gA = u2(d2(u2(s2(G3, a2(rA, S("9")), ["digit"]), (A3) => A3 - rA)), (A3) => A3.reduce((A4, B2) => 10 * A4 + B2)), fA = c2([I(gA, T(_, gA), (A3, B2) => {
    if (B2 < A3) throw new Error("quantifier range is in the wrong order");
    return { min: A3, max: B2 };
  }), I(gA, _, (A3) => ({ min: A3, max: null })), u2(gA, (A3) => ({ min: A3, max: A3 }))]), PA = "xpath" === A2.language ? I(c2([u2(GA, () => ({ min: 0, max: 1 })), u2(U, () => ({ min: 0, max: null })), u2(tA, () => ({ min: 1, max: null })), E(R, fA, V, true)]), D(GA), (A3, B2) => A3) : c2([u2(GA, () => ({ min: 0, max: 1 })), u2(U, () => ({ min: 0, max: null })), u2(tA, () => ({ min: 1, max: null })), E(R, fA, V, true)]), MA = m(I(EA, u2(D(PA), (A3) => null === A3 ? { min: 1, max: 1 } : A3), (A3, B2) => [A3, B2])), JA = I(MA, m(T(eA, f2(MA))), (A3, B2) => [A3].concat(B2));
  function SA(A3, B2) {
    return JA(A3, B2);
  }
  const KA = (function(A3) {
    return I(A3, P, h2);
  })(JA);
  return function(A3) {
    let B2;
    try {
      B2 = KA(A3, 0);
    } catch (B3) {
      throw new Error(`Error parsing pattern "${A3}": ${B3 instanceof Error ? B3.message : B3}`);
    }
    return B2.success ? B2.value : (function(A4, B3, a4) {
      const n4 = a4.map((A5) => `"${A5}"`);
      throw new Error(`Error parsing pattern "${A4}" at offset ${B3}: expected ${n4.length > 1 ? "one of " + n4.join(", ") : n4[0]} but found "${A4.slice(B3, B3 + 1)}"`);
    })(A3, B2.offset, B2.expected);
  };
}
function lA(A2) {
  return [...A2].map((A3) => A3.codePointAt(0));
}
function HA(B2, a4 = { language: "xsd" }) {
  const n4 = oA(a4)(B2), e4 = w((A2) => {
    r2(A2, n4, "xpath" === a4.language), A2.accept();
  });
  return function(A2) {
    const B3 = "xpath" === a4.language ? [-1, ...lA(A2), -2] : lA(A2);
    return e4.execute(B3).success;
  };
}

// ../gh/fontoxpath/src/expressions/dataTypes/decimalFix.ts
function decimalPlaces(x2) {
  if (!Number.isFinite(x2)) return 0;
  const s3 = String(x2);
  const e4 = s3.indexOf("e");
  if (e4 >= 0) {
    const mant = s3.slice(0, e4);
    const exp = Number(s3.slice(e4 + 1));
    const i5 = mant.indexOf(".");
    const d4 = i5 < 0 ? 0 : mant.length - i5 - 1;
    return Math.max(0, d4 - exp);
  }
  const i4 = s3.indexOf(".");
  return i4 < 0 ? 0 : s3.length - i4 - 1;
}
function fixDecimal(v3, places) {
  if (!Number.isFinite(v3)) return v3;
  if (places > 30) return v3;
  return Number(v3.toFixed(places));
}
function cleanDecimalResult(operator, a4, b3, v3) {
  switch (operator) {
    case "addOp":
    case "subtractOp":
    case "modOp":
      return fixDecimal(v3, Math.max(decimalPlaces(a4), decimalPlaces(b3)));
    case "multiplyOp":
      return fixDecimal(v3, decimalPlaces(a4) + decimalPlaces(b3));
    default:
      return v3;
  }
}
function exactDecimalSum(values) {
  let places = 0;
  for (const v3 of values) places = Math.max(places, decimalPlaces(v3));
  let sum = 0;
  for (const v3 of values) sum = fixDecimal(sum + v3, places);
  return sum;
}

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_numeric.ts
function createValidNumericType(type, transformedValue) {
  if (isSubtypeOf(type, 5 /* XSINTEGER */)) {
    return createAtomicValue(transformedValue, 5 /* XSINTEGER */);
  }
  if (isSubtypeOf(type, 6 /* XSFLOAT */)) {
    return createAtomicValue(transformedValue, 6 /* XSFLOAT */);
  }
  if (isSubtypeOf(type, 3 /* XSDOUBLE */)) {
    return createAtomicValue(transformedValue, 3 /* XSDOUBLE */);
  }
  return createAtomicValue(transformedValue, 4 /* XSDECIMAL */);
}
var ROMAN_NUMBERS = [
  { symbol: "M", decimal: 1e3 },
  { symbol: "CM", decimal: 900 },
  { symbol: "D", decimal: 500 },
  { symbol: "CD", decimal: 400 },
  { symbol: "C", decimal: 100 },
  { symbol: "XC", decimal: 90 },
  { symbol: "L", decimal: 50 },
  { symbol: "XL", decimal: 40 },
  { symbol: "X", decimal: 10 },
  { symbol: "IX", decimal: 9 },
  { symbol: "V", decimal: 5 },
  { symbol: "IV", decimal: 4 },
  { symbol: "I", decimal: 1 }
];
function convertIntegerToRoman(integer, isLowerCase) {
  const isNegative = integer < 0;
  integer = Math.abs(integer);
  if (!integer) {
    return "-";
  }
  let romanString = ROMAN_NUMBERS.reduce((str, roman) => {
    const q3 = Math.floor(integer / roman.decimal);
    integer -= q3 * roman.decimal;
    return str + roman.symbol.repeat(q3);
  }, "");
  if (isLowerCase) {
    romanString = romanString.toLowerCase();
  }
  if (isNegative) {
    romanString = `-${romanString}`;
  }
  return romanString;
}
function convertIntegerToLowerRoman(integer) {
  return convertIntegerToRoman(integer, true);
}
function convertIntegerToUpperRoman(integer) {
  return convertIntegerToRoman(integer, false);
}
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function convertIntegerToAlphabet(integer, isLowerCase) {
  const isNegative = integer < 0;
  integer = Math.abs(integer);
  if (!integer) {
    return "-";
  }
  let output = "";
  let digit;
  while (integer > 0) {
    digit = (integer - 1) % ALPHABET.length;
    output = ALPHABET[digit] + output;
    integer = (integer - digit) / ALPHABET.length | 0;
  }
  if (isLowerCase) {
    output = output.toLowerCase();
  }
  if (isNegative) {
    output = `-${output}`;
  }
  return output;
}
function convertIntegerToLowerAlphabet(integer) {
  return convertIntegerToAlphabet(integer, true);
}
function convertIntegerToUpperAlphabet(integer) {
  return convertIntegerToAlphabet(integer, false);
}
function getUnicodeSubset(firstCharacterCharCode, numberOfCharacters, charactersToSkip = []) {
  return Array.from({ length: numberOfCharacters }, (_2, i4) => i4 + firstCharacterCharCode).filter(
    (charCode) => {
      return !charactersToSkip.includes(charCode);
    }
  );
}
var HEBREW_ALPHABET_UNICODE = getUnicodeSubset(
  1488,
  27,
  [1498, 1501, 1503, 1507, 1509]
);
var ARABIC_ALPHABET_UNICODE = getUnicodeSubset(
  1575,
  36,
  [1577, 1595, 1596, 1597, 1598, 1599, 1600, 1609]
);
var ARABIC_ABJADI_ALPHABET = [
  "\u0623",
  "\u0628",
  "\u062C",
  "\u062F",
  "\u0647",
  "\u0648",
  "\u0632",
  "\u062D",
  "\u0637",
  "\u064A",
  "\u0643",
  "\u0644",
  "\u0645",
  "\u0646",
  "\u0633",
  "\u0639",
  "\u0641",
  "\u0635",
  "\u0642",
  "\u0631",
  "\u0634",
  "\u062A",
  "\u062B",
  "\u062E",
  "\u0630",
  "\u0636",
  "\u0638",
  "\u063A"
];
var DECIMAL_TO_ARABIC_ABJAD_NUMBER_TABLE = [
  [1e3, "\u063A"],
  [900, "\u0638"],
  [800, "\u0636"],
  [700, "\u0630"],
  [600, "\u062E"],
  [500, "\u062B"],
  [400, "\u062A"],
  [300, "\u0634"],
  [200, "\u0631"],
  [100, "\u0642"],
  [90, "\u0635"],
  [80, "\u0641"],
  [70, "\u0639"],
  [60, "\u0633"],
  [50, "\u0646"],
  [40, "\u0645"],
  [30, "\u0644"],
  [20, "\u0643"],
  [10, "\u064A"],
  [9, "\u0637"],
  [8, "\u062D"],
  [7, "\u0632"],
  [6, "\u0648"],
  [5, "\u0647"],
  [4, "\u062F"],
  [3, "\u062C"],
  [2, "\u0628"],
  [1, "\u0623"]
];
var DECIMAL_TO_HEBREW_ALEFBET_NUMBER_TABLE = [
  [400, "\u05EA"],
  [300, "\u05E9"],
  [200, "\u05E8"],
  [100, "\u05E7"],
  [90, "\u05E6"],
  [80, "\u05E4"],
  [70, "\u05E2"],
  [60, "\u05E1"],
  [50, "\u05E0"],
  [40, "\u05DE"],
  [30, "\u05DC"],
  [20, "\u05DB"],
  [10, "\u05D9"],
  [9, "\u05D8"],
  [8, "\u05D7"],
  [7, "\u05D6"],
  [6, "\u05D5"],
  [5, "\u05D4"],
  [4, "\u05D3"],
  [3, "\u05D2"],
  [2, "\u05D1"],
  [1, "\u05D0"]
];
function createUnicodeRangeBasedNumberFormatter(firstCharacterCharCode, numberOfCharacters, charactersToSkip = []) {
  charactersToSkip.sort((a4, b3) => a4 - b3);
  numberOfCharacters = numberOfCharacters - charactersToSkip.length;
  return function formatAsNumberInUnicodeRange(integer) {
    const isNegative = integer < 0;
    integer = Math.abs(integer);
    if (!integer) {
      return "-";
    }
    const formattedNumberParts = [];
    while (integer > 0) {
      const digit = (integer - 1) % numberOfCharacters;
      let charCode = firstCharacterCharCode + digit;
      charactersToSkip.forEach((char2) => {
        if (charCode >= char2) {
          charCode++;
        }
      });
      formattedNumberParts.unshift(String.fromCodePoint(charCode));
      integer = Math.floor((integer - 1) / numberOfCharacters);
    }
    let output = formattedNumberParts.join("");
    if (isNegative) {
      output = `-${output}`;
    }
    return output;
  };
}
var convertIntegerToLowerGreek = createUnicodeRangeBasedNumberFormatter(945, 25, [962]);
var convertIntegerToUpperGreek = createUnicodeRangeBasedNumberFormatter(913, 25, [930]);
function convertIntegerToHebrewAlefBet(integer) {
  const isNegative = integer < 0;
  integer = Math.abs(integer);
  if (!integer) {
    return "-";
  }
  const multiples = Math.floor((integer - 1) / HEBREW_ALPHABET_UNICODE.length);
  const repeatChar = String.fromCodePoint(1514);
  const formattedNumberParts = Array(multiples).fill(repeatChar);
  const digit = (integer - 1) % HEBREW_ALPHABET_UNICODE.length;
  const charCode = HEBREW_ALPHABET_UNICODE[digit];
  formattedNumberParts.push(String.fromCodePoint(charCode));
  let output = formattedNumberParts.join("");
  if (isNegative) {
    output = `-${output}`;
  }
  return output;
}
function convertIntegerToArabicAlifBaTa(integer) {
  const isNegative = integer < 0;
  integer = Math.abs(integer);
  if (!integer) {
    return "-";
  }
  const multiples = Math.floor((integer - 1) / ARABIC_ALPHABET_UNICODE.length) + 1;
  const digit = (integer - 1) % ARABIC_ALPHABET_UNICODE.length;
  const charCode = ARABIC_ALPHABET_UNICODE[digit];
  const formattedNumberParts = Array(multiples).fill(String.fromCodePoint(charCode));
  let output = formattedNumberParts.join(String.fromCodePoint(8204));
  if (isNegative) {
    output = `-${output}`;
  }
  return output;
}
function convertIntegerToArabicAbjadi(integer) {
  const isNegative = integer < 0;
  integer = Math.abs(integer);
  if (!integer) {
    return "-";
  }
  const multiples = Math.floor((integer - 1) / ARABIC_ABJADI_ALPHABET.length) + 1;
  const digit = (integer - 1) % ARABIC_ABJADI_ALPHABET.length;
  const formattedNumberParts = Array(multiples).fill(ARABIC_ABJADI_ALPHABET[digit]);
  let output = formattedNumberParts.join(String.fromCodePoint(8204));
  if (isNegative) {
    output = `-${output}`;
  }
  return output;
}
function convertIntegerToAbjadNumeral(integer) {
  const isNegative = integer < 0;
  integer = Math.abs(integer);
  if (!integer) {
    return "-";
  }
  const arabicAbjadNumberParts = [];
  let thousands = Math.floor(integer / 1e3);
  let remainder = integer - thousands * 1e3;
  if (thousands === 1) {
    arabicAbjadNumberParts.push(DECIMAL_TO_ARABIC_ABJAD_NUMBER_TABLE[0][1]);
  } else if (thousands > 1) {
    for (const [val, char2] of DECIMAL_TO_ARABIC_ABJAD_NUMBER_TABLE) {
      while (thousands >= val) {
        arabicAbjadNumberParts.push(char2);
        thousands -= val;
      }
    }
    arabicAbjadNumberParts.push(DECIMAL_TO_ARABIC_ABJAD_NUMBER_TABLE[0][1]);
  }
  for (const [val, char2] of DECIMAL_TO_ARABIC_ABJAD_NUMBER_TABLE) {
    while (remainder >= val) {
      remainder -= val;
      arabicAbjadNumberParts.push(char2);
    }
  }
  let output = arabicAbjadNumberParts.join("");
  if (isNegative) {
    output = `-${output}`;
  }
  return output;
}
function convertIntegerToHebrewNumeral(integer) {
  const isNegative = integer < 0;
  integer = Math.abs(integer);
  if (!integer) {
    return "-";
  }
  const hebrewNumberParts = [];
  const fourHundreds = Math.floor(integer / 400);
  let remainder = integer - fourHundreds * 400;
  for (let i4 = 0; i4 < fourHundreds; i4++) {
    hebrewNumberParts.push("\u05EA");
  }
  for (const [val, char2] of DECIMAL_TO_HEBREW_ALEFBET_NUMBER_TABLE) {
    while (remainder >= val) {
      remainder -= val;
      hebrewNumberParts.push(char2);
    }
  }
  const lastTwoChars = hebrewNumberParts.slice(-2).join("");
  if (lastTwoChars === "\u05D9\u05D4") {
    hebrewNumberParts.splice(-2, 2, "\u05D8", "\u05D5");
  }
  if (lastTwoChars === "\u05D9\u05D5") {
    hebrewNumberParts.splice(-2, 2, "\u05D8", "\u05D6");
  }
  let output = hebrewNumberParts.join("");
  if (isNegative) {
    output = `-${output}`;
  }
  return output;
}
function convertIntegerToArabicIndicNumeral(integer) {
  return new Intl.NumberFormat([], {
    // @ts-ignore TS does not recognize this NumberFormatOption because it is still an experimental part of the spec. However it is supported by all major browsers.
    numberingSystem: "arab",
    useGrouping: false
  }).format(integer);
}
function convertIntegerToPersianNumeral(integer) {
  return new Intl.NumberFormat([], {
    // @ts-ignore TS does not recognize this NumberFormatOption because it is still an experimental part of the spec. However it is supported by all major browsers.
    numberingSystem: "arabext",
    useGrouping: false
  }).format(integer);
}
var fnAbs = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createValidNumericType(onlyValue.type, Math.abs(onlyValue.value))
  );
};
var integerConverters = /* @__PURE__ */ new Map([
  ["A", convertIntegerToUpperAlphabet],
  ["a", convertIntegerToLowerAlphabet],
  ["I", convertIntegerToUpperRoman],
  ["i", convertIntegerToLowerRoman],
  ["lowerGreek", convertIntegerToLowerGreek],
  ["\u03B1", convertIntegerToLowerGreek],
  ["upperGreek", convertIntegerToUpperGreek],
  ["\u0391", convertIntegerToUpperGreek],
  ["arabicAbjadi", convertIntegerToArabicAbjadi],
  ["arabicAbjadNumeral", convertIntegerToAbjadNumeral],
  ["arabicAlifBaTa", convertIntegerToArabicAlifBaTa],
  ["hebrewAlefBet", convertIntegerToHebrewAlefBet],
  ["hebrewNumeral", convertIntegerToHebrewNumeral],
  ["arabicIndicNumeral", convertIntegerToArabicIndicNumeral],
  ["\u0661", convertIntegerToArabicIndicNumeral],
  ["\u0662", convertIntegerToArabicIndicNumeral],
  ["\u0663", convertIntegerToArabicIndicNumeral],
  ["\u0664", convertIntegerToArabicIndicNumeral],
  ["\u0665", convertIntegerToArabicIndicNumeral],
  ["\u0666", convertIntegerToArabicIndicNumeral],
  ["\u0667", convertIntegerToArabicIndicNumeral],
  ["\u0668", convertIntegerToArabicIndicNumeral],
  ["\u0669", convertIntegerToArabicIndicNumeral],
  ["persianNumeral", convertIntegerToPersianNumeral],
  ["\u06F1", convertIntegerToPersianNumeral],
  ["\u06F2", convertIntegerToPersianNumeral],
  ["\u06F3", convertIntegerToPersianNumeral],
  ["\u06F4", convertIntegerToPersianNumeral],
  ["\u06F5", convertIntegerToPersianNumeral],
  ["\u06F6", convertIntegerToPersianNumeral],
  ["\u06F7", convertIntegerToPersianNumeral],
  ["\u06F8", convertIntegerToPersianNumeral],
  ["\u06F9", convertIntegerToPersianNumeral]
]);
var fnFormatInteger = (_dynamicContext, _executionParameters, _staticContext, sequence2, pictureSequence) => {
  const sequenceValue = sequence2.first();
  const pictureValue = pictureSequence.first();
  if (sequence2.isEmpty()) {
    return sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */));
  }
  const integerConverter = integerConverters.get(pictureValue.value);
  const integer = sequenceValue.value;
  if (integerConverter) {
    const convertedString = integerConverter(integer);
    return sequenceFactory_default.singleton(createAtomicValue(convertedString, 1 /* XSSTRING */));
  } else {
    return sequenceFactory_default.singleton(createAtomicValue(integer.toString(), 1 /* XSSTRING */));
  }
};
var fnCeiling = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createValidNumericType(onlyValue.type, Math.ceil(onlyValue.value))
  );
};
var fnFloor = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createValidNumericType(onlyValue.type, Math.floor(onlyValue.value))
  );
};
function isHalf(value, scaling) {
  return value * scaling % 1 % 0.5 === 0;
}
function getNumberOfDecimalDigits(value) {
  if (Math.floor(value) === value || isNaN(value)) {
    return 0;
  }
  const result = /\d+(?:\.(\d*))?(?:[Ee](-)?(\d+))*/.exec(`${value}`);
  const decimals = result[1] ? result[1].length : 0;
  if (result[3]) {
    if (result[2]) {
      return decimals + parseInt(result[3], 10);
    }
    const returnVal = decimals - parseInt(result[3], 10);
    return returnVal < 0 ? 0 : returnVal;
  }
  return decimals;
}
function determineRoundedNumber(itemAsDecimal, halfToEven, scaling, inexact = false) {
  if (halfToEven && isHalf(itemAsDecimal, scaling)) {
    if (Math.floor(itemAsDecimal * scaling) % 2 === 0) {
      return Math.floor(itemAsDecimal * scaling) / scaling;
    }
    return Math.ceil(itemAsDecimal * scaling) / scaling;
  }
  const scaled = inexact ? itemAsDecimal * scaling : fixDecimal(
    itemAsDecimal * scaling,
    Math.max(0, decimalPlaces(itemAsDecimal) - Math.round(Math.log10(scaling)))
  );
  return Math.round(scaled) / scaling;
}
function fnRound(halfToEven, _dynamicContext, _executionParameters, _staticContext, sequence2, precision) {
  let done = false;
  return sequenceFactory_default.create({
    next: () => {
      if (done) {
        return DONE_TOKEN;
      }
      const firstValue = sequence2.first();
      if (!firstValue) {
        done = true;
        return DONE_TOKEN;
      }
      if ((isSubtypeOf(firstValue.type, 6 /* XSFLOAT */) || isSubtypeOf(firstValue.type, 3 /* XSDOUBLE */)) && (firstValue.value === 0 || isNaN(firstValue.value) || firstValue.value === Infinity || firstValue.value === -Infinity)) {
        done = true;
        return ready(firstValue);
      }
      let scalingPrecision;
      if (precision) {
        const sp = precision.first();
        scalingPrecision = sp.value;
      } else {
        scalingPrecision = 0;
      }
      done = true;
      if (getNumberOfDecimalDigits(firstValue.value) < scalingPrecision) {
        return ready(firstValue);
      }
      const originalType = [
        5 /* XSINTEGER */,
        4 /* XSDECIMAL */,
        3 /* XSDOUBLE */,
        6 /* XSFLOAT */
      ].find((type) => {
        return isSubtypeOf(firstValue.type, type);
      });
      const itemAsDecimal = castToType(firstValue, 4 /* XSDECIMAL */);
      const scaling = Math.pow(10, scalingPrecision);
      const isBinaryValue = firstValue.inexact === true || isSubtypeOf(firstValue.type, 6 /* XSFLOAT */) || isSubtypeOf(firstValue.type, 3 /* XSDOUBLE */);
      const roundedNumber = determineRoundedNumber(
        itemAsDecimal.value,
        halfToEven,
        scaling,
        isBinaryValue
      );
      switch (originalType) {
        case 4 /* XSDECIMAL */:
          return ready(createAtomicValue(roundedNumber, 4 /* XSDECIMAL */));
        case 3 /* XSDOUBLE */:
          return ready(createAtomicValue(roundedNumber, 3 /* XSDOUBLE */));
        case 6 /* XSFLOAT */:
          return ready(createAtomicValue(roundedNumber, 6 /* XSFLOAT */));
        case 5 /* XSINTEGER */:
          return ready(createAtomicValue(roundedNumber, 5 /* XSINTEGER */));
      }
    }
  });
}
var fnNumber = (_dynamicContext, executionParameters, _staticContext, sequence2) => {
  return atomize(sequence2, executionParameters).switchCases({
    empty: () => sequenceFactory_default.singleton(createAtomicValue(NaN, 3 /* XSDOUBLE */)),
    singleton: () => {
      const castResult = tryCastToType(sequence2.first(), 3 /* XSDOUBLE */);
      if (castResult.successful) {
        return sequenceFactory_default.singleton(castResult.value);
      }
      return sequenceFactory_default.singleton(createAtomicValue(NaN, 3 /* XSDOUBLE */));
    },
    multiple: () => {
      throw new Error("fn:number may only be called with zero or one values");
    }
  });
};
function createSeedFromString(seed) {
  let hash2 = 5381;
  for (let i4 = 0; i4 < seed.length; ++i4) {
    const c3 = seed.charCodeAt(i4);
    hash2 = hash2 * 33 + c3;
    hash2 = hash2 % Number.MAX_SAFE_INTEGER;
  }
  return hash2;
}
var fnRandomNumberGenerator = (dynamicContext, _executionParameters, _staticContext, sequence2 = sequenceFactory_default.empty()) => {
  const iseed = sequence2.isEmpty() ? dynamicContext.getRandomNumber() : dynamicContext.getRandomNumber(
    createSeedFromString(castToType(sequence2.first(), 1 /* XSSTRING */).value)
  );
  function fnRandomImplementation(iseed2) {
    const permute = (_dynamicContext, _executionParameters2, _staticContext2, sequence3) => {
      if (sequence3.isEmpty() || sequence3.isSingleton()) {
        return sequence3;
      }
      const allValues = sequence3.getAllValues();
      let permuteCurrent = iseed2;
      for (let i4 = allValues.length - 1; i4 > 1; i4--) {
        permuteCurrent = dynamicContext.getRandomNumber(permuteCurrent).currentInt;
        const j2 = permuteCurrent % i4;
        const t4 = allValues[j2];
        allValues[j2] = allValues[i4];
        allValues[i4] = t4;
      }
      return sequenceFactory_default.create(allValues);
    };
    return sequenceFactory_default.singleton(
      new MapValue_default([
        {
          key: createAtomicValue("number", 1 /* XSSTRING */),
          value: () => sequenceFactory_default.singleton(
            createAtomicValue(
              dynamicContext.getRandomNumber(iseed2).currentDecimal,
              3 /* XSDOUBLE */
            )
          )
        },
        {
          key: createAtomicValue("next", 1 /* XSSTRING */),
          value: () => sequenceFactory_default.singleton(
            new FunctionValue_default({
              value: () => fnRandomImplementation(
                dynamicContext.getRandomNumber(iseed2).currentInt
              ),
              isAnonymous: true,
              localName: "",
              namespaceURI: "",
              argumentTypes: [],
              arity: 0,
              returnType: {
                type: 61 /* MAP */,
                mult: 3 /* EXACTLY_ONE */
              }
            })
          )
        },
        {
          key: createAtomicValue("permute", 1 /* XSSTRING */),
          value: () => sequenceFactory_default.singleton(
            new FunctionValue_default({
              value: permute,
              isAnonymous: true,
              localName: "",
              namespaceURI: "",
              argumentTypes: [
                {
                  type: 59 /* ITEM */,
                  mult: 2 /* ZERO_OR_MORE */
                }
              ],
              arity: 1,
              returnType: {
                type: 59 /* ITEM */,
                mult: 2 /* ZERO_OR_MORE */
              }
            })
          )
        }
      ])
    );
  }
  return fnRandomImplementation(iseed.currentInt);
};
var declarations = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "abs",
    argumentTypes: [{ type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnAbs
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "format-integer",
    argumentTypes: [
      { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnFormatInteger
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "ceiling",
    argumentTypes: [{ type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnCeiling
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "floor",
    argumentTypes: [{ type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnFloor
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "round",
    argumentTypes: [{ type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnRound.bind(null, false)
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "round",
    argumentTypes: [
      { type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnRound.bind(null, false)
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "round-half-to-even",
    argumentTypes: [{ type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnRound.bind(null, true)
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "round-half-to-even",
    argumentTypes: [
      { type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 2 /* XSNUMERIC */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnRound.bind(null, true)
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "number",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 3 /* XSDOUBLE */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnNumber
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "number",
    argumentTypes: [],
    returnType: { type: 3 /* XSDOUBLE */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: (dynamicContext, executionParameters, staticContext) => {
      const atomizedContextItem = dynamicContext.contextItem && performFunctionConversion(
        { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ },
        sequenceFactory_default.singleton(dynamicContext.contextItem),
        executionParameters,
        "fn:number",
        false
      );
      if (!atomizedContextItem) {
        throw errXPDY0002("fn:number needs an atomizable context item.");
      }
      return fnNumber(
        dynamicContext,
        executionParameters,
        staticContext,
        atomizedContextItem
      );
    }
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "random-number-generator",
    argumentTypes: [],
    returnType: { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnRandomNumberGenerator
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "random-number-generator",
    argumentTypes: [
      {
        type: 46 /* XSANYATOMICTYPE */,
        mult: 0 /* ZERO_OR_ONE */
      }
    ],
    returnType: { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnRandomNumberGenerator
  }
];
var builtInFunctions_numeric_default = {
  declarations,
  functions: {
    ["number"]: fnNumber,
    round: fnRound
  }
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_string.ts
var fnRound2 = builtInFunctions_numeric_default.functions.round;
function collationError() {
  throw new Error("FOCH0002: No collations are supported");
}
var fnCompare = (_dynamicContext, _executionParameters, _staticContext, arg1, arg2) => {
  if (arg1.isEmpty() || arg2.isEmpty()) {
    return sequenceFactory_default.empty();
  }
  const arg1Value = arg1.first().value;
  const arg2Value = arg2.first().value;
  if (arg1Value > arg2Value) {
    return sequenceFactory_default.singleton(createAtomicValue(1, 5 /* XSINTEGER */));
  }
  if (arg1Value < arg2Value) {
    return sequenceFactory_default.singleton(createAtomicValue(-1, 5 /* XSINTEGER */));
  }
  return sequenceFactory_default.singleton(createAtomicValue(0, 5 /* XSINTEGER */));
};
var fnConcat = (_dynamicContext, executionParameters, _staticContext, ...stringSequences) => {
  stringSequences = stringSequences.map((sequence2) => {
    return atomize(sequence2, executionParameters).mapAll((allValues) => {
      return sequenceFactory_default.singleton(
        createAtomicValue(
          allValues.map(
            (stringValue) => stringValue === null ? "" : castToType(stringValue, 1 /* XSSTRING */).value
          ).join(""),
          1 /* XSSTRING */
        )
      );
    });
  });
  return zipSingleton(stringSequences, (stringValues) => {
    return sequenceFactory_default.singleton(
      createAtomicValue(
        stringValues.map((stringValue) => stringValue.value).join(""),
        1 /* XSSTRING */
      )
    );
  });
};
var fnContains = (_dynamicContext, _executionParameters, _staticContext, arg1, arg2) => {
  const stringToTest = !arg1.isEmpty() ? arg1.first().value : "";
  const contains2 = !arg2.isEmpty() ? arg2.first().value : "";
  if (contains2.length === 0) {
    return sequenceFactory_default.singletonTrueSequence();
  }
  if (stringToTest.length === 0) {
    return sequenceFactory_default.singletonFalseSequence();
  }
  if (stringToTest.includes(contains2)) {
    return sequenceFactory_default.singletonTrueSequence();
  }
  return sequenceFactory_default.singletonFalseSequence();
};
var fnStartsWith = (_dynamicContext, _executionParameters, _staticContext, arg1, arg2) => {
  const startsWith = !arg2.isEmpty() ? arg2.first().value : "";
  if (startsWith.length === 0) {
    return sequenceFactory_default.singletonTrueSequence();
  }
  const stringToTest = !arg1.isEmpty() ? arg1.first().value : "";
  if (stringToTest.length === 0) {
    return sequenceFactory_default.singletonFalseSequence();
  }
  if (stringToTest.startsWith(startsWith)) {
    return sequenceFactory_default.singletonTrueSequence();
  }
  return sequenceFactory_default.singletonFalseSequence();
};
var fnEndsWith = (_dynamicContext, _executionParameters, _staticContext, arg1, arg2) => {
  const endsWith = !arg2.isEmpty() ? arg2.first().value : "";
  if (endsWith.length === 0) {
    return sequenceFactory_default.singletonTrueSequence();
  }
  const stringToTest = !arg1.isEmpty() ? arg1.first().value : "";
  if (stringToTest.length === 0) {
    return sequenceFactory_default.singletonFalseSequence();
  }
  if (stringToTest.endsWith(endsWith)) {
    return sequenceFactory_default.singletonTrueSequence();
  }
  return sequenceFactory_default.singletonFalseSequence();
};
var fnString = (_dynamicContext, executionParameters, _staticContext, sequence2) => {
  return sequence2.switchCases({
    empty: () => sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */)),
    default: () => sequence2.map((value) => {
      if (isSubtypeOf(value.type, 53 /* NODE */)) {
        const stringValueSequence = atomizeSingleValue(value, executionParameters);
        const stringValue = stringValueSequence.first();
        if (isSubtypeOf(value.type, 47 /* ATTRIBUTE */)) {
          return castToType(stringValue, 1 /* XSSTRING */);
        }
        return stringValue;
      }
      return castToType(value, 1 /* XSSTRING */);
    })
  });
};
var fnStringJoin = (_dynamicContext, executionParameters, _staticContext, sequence2, separator2) => {
  return zipSingleton(
    [separator2],
    ([separatorString]) => atomize(sequence2, executionParameters).mapAll((allStrings) => {
      const joinedString = allStrings.map((stringValue) => castToType(stringValue, 1 /* XSSTRING */).value).join(separatorString.value);
      return sequenceFactory_default.singleton(createAtomicValue(joinedString, 1 /* XSSTRING */));
    })
  );
};
var fnStringLength = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequenceFactory_default.singleton(createAtomicValue(0, 5 /* XSINTEGER */));
  }
  const stringValue = sequence2.first().value;
  return sequenceFactory_default.singleton(
    createAtomicValue(Array.from(stringValue).length, 5 /* XSINTEGER */)
  );
};
var fnSubstringBefore = (_dynamicContext, _executionParameters, _staticContext, arg1, arg2) => {
  const strArg1 = arg1.isEmpty() ? "" : arg1.first().value;
  const strArg2 = arg2.isEmpty() ? "" : arg2.first().value;
  if (strArg2 === "") {
    return sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */));
  }
  const startIndex = strArg1.indexOf(strArg2);
  if (startIndex === -1) {
    return sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */));
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(strArg1.substring(0, startIndex), 1 /* XSSTRING */)
  );
};
var fnSubstringAfter = (_dynamicContext, _executionParameters, _staticContext, arg1, arg2) => {
  const strArg1 = arg1.isEmpty() ? "" : arg1.first().value;
  const strArg2 = arg2.isEmpty() ? "" : arg2.first().value;
  if (strArg2 === "") {
    return sequenceFactory_default.singleton(createAtomicValue(strArg1, 1 /* XSSTRING */));
  }
  const startIndex = strArg1.indexOf(strArg2);
  if (startIndex === -1) {
    return sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */));
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(strArg1.substring(startIndex + strArg2.length), 1 /* XSSTRING */)
  );
};
var fnSubstring = (dynamicContext, executionParameters, staticContext, sourceString, start, length) => {
  const roundedStart = fnRound2(
    false,
    dynamicContext,
    executionParameters,
    staticContext,
    start,
    null
  );
  const roundedLength = length !== null ? fnRound2(false, dynamicContext, executionParameters, staticContext, length, null) : null;
  let done = false;
  let sourceStringItem = null;
  let startItem = null;
  let lengthItem = null;
  return sequenceFactory_default.create({
    next: () => {
      if (done) {
        return DONE_TOKEN;
      }
      if (!sourceStringItem) {
        sourceStringItem = sourceString.first();
        if (sourceStringItem === null) {
          done = true;
          return ready(createAtomicValue("", 1 /* XSSTRING */));
        }
      }
      if (!startItem) {
        startItem = roundedStart.first();
      }
      if (!lengthItem && length) {
        lengthItem = null;
        lengthItem = roundedLength.first();
      }
      done = true;
      const strValue = sourceStringItem.value;
      return ready(
        createAtomicValue(
          Array.from(strValue).slice(
            Math.max(startItem.value - 1, 0),
            length ? startItem.value + lengthItem.value - 1 : void 0
          ).join(""),
          1 /* XSSTRING */
        )
      );
    }
  });
};
var fnTokenize = (_dynamicContext, _executionParameters, _staticContext, input, pattern) => {
  if (input.isEmpty() || input.first().value.length === 0) {
    return sequenceFactory_default.empty();
  }
  const inputString = input.first().value;
  const patternString = pattern.first().value;
  const regex2 = compileJSRegex(patternString);
  regex2.lastIndex = 0;
  const results = [];
  let result = regex2.exec(inputString);
  let index = 0;
  while (result) {
    results.push(inputString.slice(index, result.index));
    index = regex2.lastIndex;
    result = regex2.exec(inputString);
  }
  results.push(inputString.slice(index));
  return sequenceFactory_default.create(
    results.map((token) => createAtomicValue(token, 1 /* XSSTRING */))
  );
};
var fnUpperCase = (_dynamicContext, _executionParameters, _staticContext, stringSequence) => {
  if (stringSequence.isEmpty()) {
    return sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */));
  }
  return stringSequence.map(
    (stringValue) => createAtomicValue(stringValue.value.toUpperCase(), 1 /* XSSTRING */)
  );
};
var fnLowerCase = (_dynamicContext, _executionParameters, _staticContext, stringSequence) => {
  if (stringSequence.isEmpty()) {
    return sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */));
  }
  return stringSequence.map(
    (stringValue) => createAtomicValue(stringValue.value.toLowerCase(), 1 /* XSSTRING */)
  );
};
var fnNormalizeSpace = (_dynamicContext, _executionParameters, _staticContext, arg) => {
  if (arg.isEmpty()) {
    return sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */));
  }
  const stringValue = arg.first().value.trim();
  return sequenceFactory_default.singleton(
    createAtomicValue(stringValue.replace(/\s+/g, " "), 1 /* XSSTRING */)
  );
};
var fnTranslate = (_dynamicContext, _executionParameters, _staticContext, argSequence, mapStringSequence, transStringSequence) => {
  return zipSingleton(
    [argSequence, mapStringSequence, transStringSequence],
    ([argValue, mapStringSequenceValue, transStringSequenceValue]) => {
      const argArr = Array.from(argValue ? argValue.value : "");
      const mapStringArr = Array.from(mapStringSequenceValue.value);
      const transStringArr = Array.from(transStringSequenceValue.value);
      const result = argArr.map((letter) => {
        if (mapStringArr.includes(letter)) {
          const index = mapStringArr.indexOf(letter);
          if (index <= transStringArr.length) {
            return transStringArr[index];
          }
        } else {
          return letter;
        }
      });
      return sequenceFactory_default.singleton(
        createAtomicValue(result.join(""), 1 /* XSSTRING */)
      );
    }
  );
};
var fnCodepointsToString = (_dynamicContext, _executionParameters, _staticContext, numberSequence) => {
  return numberSequence.mapAll((numbers) => {
    const str = numbers.map((num) => {
      const numericValue = num.value;
      if (numericValue === 9 || numericValue === 10 || numericValue === 13 || numericValue >= 32 && numericValue <= 55295 || numericValue >= 57344 && numericValue <= 65533 || numericValue >= 65536 && numericValue <= 1114111) {
        return String.fromCodePoint(numericValue);
      } else {
        throw new Error("FOCH0001");
      }
    }).join("");
    return sequenceFactory_default.singleton(createAtomicValue(str, 1 /* XSSTRING */));
  });
};
var fnStringToCodepoints = (_dynamicContext, _executionParameters, _staticContext, stringSequence) => {
  return zipSingleton([stringSequence], ([str]) => {
    const characters = str ? str.value.split("") : [];
    if (characters.length === 0) {
      return sequenceFactory_default.empty();
    }
    return sequenceFactory_default.create(
      characters.map(
        (character) => createAtomicValue(character.codePointAt(0), 5 /* XSINTEGER */)
      )
    );
  });
};
var fnEncodeForUri = (_dynamicContext, _executionParameters, _staticContext, stringSequence) => {
  return zipSingleton([stringSequence], ([str]) => {
    if (str === null || str.value.length === 0) {
      return sequenceFactory_default.create(createAtomicValue("", 1 /* XSSTRING */));
    }
    return sequenceFactory_default.create(
      createAtomicValue(
        encodeURIComponent(str.value).replace(/[!'()*]/g, (c3) => {
          return "%" + c3.charCodeAt(0).toString(16).toUpperCase();
        }),
        1 /* XSSTRING */
      )
    );
  });
};
var fnIriToUri = (_dynamicContext, _executionParameters, _staticContext, stringSequence) => {
  return zipSingleton([stringSequence], ([str]) => {
    if (str === null || str.value.length === 0) {
      return sequenceFactory_default.create(createAtomicValue("", 1 /* XSSTRING */));
    }
    const strValue = str.value;
    return sequenceFactory_default.create(
      createAtomicValue(
        strValue.replace(
          /([\u00A0-\uD7FF\uE000-\uFDCF\uFDF0-\uFFEF "<>{}|\\^`/\n\u007f\u0080-\u009f]|[\uD800-\uDBFF][\uDC00-\uDFFF])/g,
          (a4) => encodeURI(a4)
        ),
        1 /* XSSTRING */
      )
    );
  });
};
var fnCodepointEqual = (_dynamicContext, _executionParameters, _staticContext, stringSequence1, stringSequence2) => {
  return zipSingleton([stringSequence1, stringSequence2], ([value1, value2]) => {
    if (value1 === null || value2 === null) {
      return sequenceFactory_default.empty();
    }
    const string1 = value1.value;
    const string2 = value2.value;
    if (string1.length !== string2.length) {
      return sequenceFactory_default.singletonFalseSequence();
    }
    const string1Characters = string1.split("");
    const string2Characters = string2.split("");
    for (let i4 = 0; i4 < string1Characters.length; i4++) {
      if (string1Characters[i4].codePointAt(0) !== string2Characters[i4].codePointAt(0)) {
        return sequenceFactory_default.singletonFalseSequence();
      }
    }
    return sequenceFactory_default.singletonTrueSequence();
  });
};
var cachedPatterns = /* @__PURE__ */ new Map();
var fnMatches = (_dynamicContext, _executionParameters, _staticContext, inputSequence, patternSequence) => {
  return zipSingleton([inputSequence, patternSequence], ([inputValue, patternValue]) => {
    const input = inputValue ? inputValue.value : "";
    const pattern = patternValue.value;
    let compiledPattern = cachedPatterns.get(pattern);
    if (!compiledPattern) {
      try {
        compiledPattern = HA(pattern, { language: "xpath" });
      } catch (error) {
        throw new Error(`FORX0002: ${error}`);
      }
      cachedPatterns.set(pattern, compiledPattern);
    }
    return compiledPattern(input) ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
  });
};
var compiledRegexes = /* @__PURE__ */ new Map();
function compileJSRegex(pattern) {
  if (compiledRegexes.has(pattern)) {
    return compiledRegexes.get(pattern);
  }
  let regex2;
  try {
    regex2 = new RegExp(pattern, "g");
  } catch (error) {
    throw new Error(`FORX0002: ${error}`);
  }
  if (regex2.test("")) {
    throw new Error(`FORX0003: the pattern ${pattern} matches the zero length string`);
  }
  compiledRegexes.set(pattern, regex2);
  return regex2;
}
var fnReplace = (_dynamicContext, _executionParameters, _staticContext, inputSequence, patternSequence, replacementSequence) => {
  return zipSingleton(
    [inputSequence, patternSequence, replacementSequence],
    ([inputValue, patternValue, replacementValue]) => {
      const input = inputValue ? inputValue.value : "";
      const pattern = patternValue.value;
      let replacement = replacementValue.value;
      if (replacement.includes("$0")) {
        throw new Error(
          "Using $0 in fn:replace to replace substrings with full matches is not supported."
        );
      }
      replacement = replacement.split(/((?:\$\$)|(?:\\\$)|(?:\\\\))/).map((part) => {
        switch (part) {
          case "\\$":
            return "$$";
          case "\\\\":
            return "\\";
          case "$$":
            throw new Error('FORX0004: invalid replacement: "$$"');
          default:
            return part;
        }
      }).join("");
      const regex2 = compileJSRegex(pattern);
      const result = input.replace(regex2, replacement);
      return sequenceFactory_default.singleton(createAtomicValue(result, 1 /* XSSTRING */));
    }
  );
};
var declarations2 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "compare",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnCompare
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "compare",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: collationError
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "concat",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ },
      4 /* ELLIPSIS */
    ],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnConcat
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "contains",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: collationError
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "contains",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnContains
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "ends-with",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnEndsWith
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "ends-with",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: collationError
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "normalize-space",
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnNormalizeSpace
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "normalize-space",
    argumentTypes: [],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: contextItemAsFirstArgument(
      "normalize-space",
      1 /* XSSTRING */,
      (dynamicContext, executionParameters, staticContext, contextItem) => fnNormalizeSpace(
        dynamicContext,
        executionParameters,
        staticContext,
        fnString(dynamicContext, executionParameters, staticContext, contextItem)
      )
    )
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "starts-with",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnStartsWith
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "starts-with",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: collationError
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "string",
    argumentTypes: [{ type: 59 /* ITEM */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnString
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "string",
    argumentTypes: [],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: contextItemAsFirstArgument("string", 59 /* ITEM */, fnString)
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "substring-before",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnSubstringBefore
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "substring-after",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnSubstringAfter
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "substring",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 3 /* XSDOUBLE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnSubstring
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "substring",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 3 /* XSDOUBLE */, mult: 3 /* EXACTLY_ONE */ },
      { type: 3 /* XSDOUBLE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnSubstring
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "upper-case",
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnUpperCase
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "lower-case",
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnLowerCase
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "string-join",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnStringJoin
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "string-join",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction(dynamicContext, executionParameters, staticContext, arg1) {
      return fnStringJoin(
        dynamicContext,
        executionParameters,
        staticContext,
        arg1,
        sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */))
      );
    }
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "string-length",
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnStringLength
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "string-length",
    argumentTypes: [],
    returnType: { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: contextItemAsFirstArgument(
      "string-length",
      // Note: deviate from the spec to allow expressions line `1!fn:string-length()` to
      // atomize the input still
      46 /* XSANYATOMICTYPE */,
      (dynamicContext, executionParameters, staticContext, contextItem) => fnStringLength(
        dynamicContext,
        executionParameters,
        staticContext,
        fnString(dynamicContext, executionParameters, staticContext, contextItem)
      )
    )
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "tokenize",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: {
      type: 1 /* XSSTRING */,
      mult: 2 /* ZERO_OR_MORE */
    },
    callFunction(_dynamicContext, _executionParameters, _staticContext, _input, _pattern, _flags) {
      throw new Error("Not implemented: Using flags in tokenize is not supported");
    }
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "tokenize",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: {
      type: 1 /* XSSTRING */,
      mult: 2 /* ZERO_OR_MORE */
    },
    callFunction: fnTokenize
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "tokenize",
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: {
      type: 1 /* XSSTRING */,
      mult: 2 /* ZERO_OR_MORE */
    },
    callFunction(dynamicContext, executionParameters, staticContext, input) {
      return fnTokenize(
        dynamicContext,
        executionParameters,
        staticContext,
        fnNormalizeSpace(dynamicContext, executionParameters, staticContext, input),
        sequenceFactory_default.singleton(createAtomicValue(" ", 1 /* XSSTRING */))
      );
    }
  },
  {
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: fnTranslate,
    localName: "translate",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [
      {
        type: 5 /* XSINTEGER */,
        mult: 2 /* ZERO_OR_MORE */
      }
    ],
    callFunction: fnCodepointsToString,
    localName: "codepoints-to-string",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnStringToCodepoints,
    localName: "string-to-codepoints",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: {
      type: 5 /* XSINTEGER */,
      mult: 2 /* ZERO_OR_MORE */
    }
  },
  {
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnEncodeForUri,
    localName: "encode-for-uri",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnIriToUri,
    localName: "iri-to-uri",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    callFunction: fnCodepointEqual,
    localName: "codepoint-equal",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: {
      type: 0 /* XSBOOLEAN */,
      mult: 0 /* ZERO_OR_ONE */
    }
  },
  {
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: fnMatches,
    localName: "matches",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: fnReplace,
    localName: "replace",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    localName: "replace",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
    callFunction(_dynamicContext, _executionParameters, _staticContext, _input, _pattern, _flags) {
      throw new Error("Not implemented: Using flags in replace is not supported");
    }
  }
];
var builtInFunctions_string_default = {
  declarations: declarations2,
  functions: {
    concat: fnConcat,
    endsWith: fnEndsWith,
    normalizeSpace: fnNormalizeSpace,
    replace: fnReplace,
    startsWith: fnStartsWith,
    ["string"]: fnString,
    stringJoin: fnStringJoin,
    stringLength: fnStringLength,
    tokenize: fnTokenize
  }
};

// ../gh/fontoxpath/src/expressions/functions/generateId.ts
var generateIdMap = /* @__PURE__ */ new WeakMap();
var generateIdCounter = 0;
function generateId(ptr) {
  const node = ptr.node;
  if (!generateIdMap.has(node)) {
    generateIdMap.set(node, `id${++generateIdCounter}`);
  }
  return generateIdMap.get(node);
}
var generateId_default = generateId;

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_node.ts
var fnString2 = builtInFunctions_string_default.functions.string;
var fnNodeName = (_dynamicContext, executionParameters, _staticContext, sequence2) => {
  return zipSingleton([sequence2], ([pointerValue]) => {
    if (pointerValue === null) {
      return sequenceFactory_default.empty();
    }
    const domFacade2 = executionParameters.domFacade;
    const pointer = pointerValue.value;
    switch (domFacade2.getNodeType(pointer)) {
      case 1 /* ELEMENT_NODE */:
      case 2 /* ATTRIBUTE_NODE */:
        const attrOrElPointer = pointer;
        return sequenceFactory_default.singleton(
          createAtomicValue(
            new QName_default(
              domFacade2.getPrefix(attrOrElPointer),
              domFacade2.getNamespaceURI(attrOrElPointer),
              domFacade2.getLocalName(attrOrElPointer)
            ),
            23 /* XSQNAME */
          )
        );
      case 7 /* PROCESSING_INSTRUCTION_NODE */:
        const processingInstruction = pointer;
        return sequenceFactory_default.singleton(
          createAtomicValue(
            new QName_default("", "", domFacade2.getTarget(processingInstruction)),
            23 /* XSQNAME */
          )
        );
      default:
        return sequenceFactory_default.empty();
    }
  });
};
var fnName = (dynamicContext, executionParameters, staticContext, sequence2) => {
  return sequence2.switchCases({
    default: () => fnString2(
      dynamicContext,
      executionParameters,
      staticContext,
      fnNodeName(dynamicContext, executionParameters, staticContext, sequence2)
    ),
    empty: () => sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */))
  });
};
var fnData = (_dynamicContext, executionParameters, _staticContext, sequence2) => {
  return atomize(sequence2, executionParameters);
};
var fnGenerateId = (dynamicContext, executionParameters, _staticContext, nodeValue) => {
  if (nodeValue.isEmpty()) {
    return sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */));
  }
  if (!isSubtypeOf(nodeValue.first().type, 53 /* NODE */)) {
    throw new Error("XPTY0004: The context item must be a node.");
  }
  const node = nodeValue.first().value;
  return sequenceFactory_default.singleton(createAtomicValue(generateId_default(node), 1 /* XSSTRING */));
};
var fnHasChildren = (_dynamicContext, executionParameters, _staticContext, nodeSequence) => {
  return zipSingleton([nodeSequence], ([pointerValue]) => {
    const pointer = pointerValue ? pointerValue.value : null;
    if (pointer !== null && executionParameters.domFacade.getFirstChildPointer(pointer, null)) {
      return sequenceFactory_default.singletonTrueSequence();
    }
    return sequenceFactory_default.singletonFalseSequence();
  });
};
function areSameNode(nodeA, nodeB, domFacade2) {
  if (domFacade2.getNodeType(nodeA) !== domFacade2.getNodeType(nodeB)) {
    return false;
  }
  if (domFacade2.getNodeType(nodeB) === 1 /* ELEMENT_NODE */) {
    return domFacade2.getLocalName(nodeB) === domFacade2.getLocalName(nodeA) && domFacade2.getNamespaceURI(nodeB) === domFacade2.getNamespaceURI(nodeA);
  }
  if (domFacade2.getNodeType(nodeB) === 7 /* PROCESSING_INSTRUCTION_NODE */) {
    return domFacade2.getTarget(nodeB) === domFacade2.getTarget(nodeA);
  }
  return true;
}
function langMatchString(truth, test) {
  truth = truth.toLowerCase();
  test = test.toLowerCase();
  if (truth === test) {
    return true;
  } else {
    return truth.length < 5 || !truth.startsWith(test) ? false : (
      /* Strip the least specific part and test again */
      langMatchString(truth.replace(/-[a-z0-9]+$/, ""), test)
    );
  }
}
function langMatchNode(node, domFacade2, test) {
  let toTest = node;
  while (toTest) {
    if (domFacade2.getNodeType(toTest) !== 1 /* ELEMENT_NODE */) {
      toTest = domFacade2.getParentNodePointer(toTest);
    } else if (domFacade2.getNodeType(toTest) === 1 /* ELEMENT_NODE */) {
      const attrValue = domFacade2.getAttribute(toTest, "xml:lang");
      if (attrValue) {
        return langMatchString(attrValue, test) ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
      } else {
        toTest = domFacade2.getParentNodePointer(toTest);
      }
    }
  }
  return sequenceFactory_default.singletonFalseSequence();
}
var fnLang = (dynamicContext, executionParameters, _staticContext, langTestValue, nodeValue) => {
  const domFacade2 = executionParameters.domFacade;
  let langTest;
  if (langTestValue.isEmpty()) {
    langTest = "";
  } else if (!isSubtypeOf(langTestValue.first().type, 1 /* XSSTRING */)) {
    throw new Error("XPTY0004: The first argument of lang must be a string.");
  } else {
    langTest = langTestValue.first().value;
  }
  let node;
  if (!nodeValue) {
    if (!dynamicContext || !dynamicContext.contextItem) {
      throw errXPDY0002(
        `The function lang depends on dynamic context if a node is not passed as the second argument.`
      );
    }
    if (!isSubtypeOf(dynamicContext.contextItem.type, 53 /* NODE */)) {
      throw new Error("XPTY0004: The context item must be a node.");
    }
    node = dynamicContext.contextItem.value;
  } else {
    node = nodeValue.first().value;
  }
  return langMatchNode(node, domFacade2, langTest);
};
var fnPath = (_dynamicContext, executionParameters, _staticContext, nodeSequence) => {
  return zipSingleton([nodeSequence], ([pointerValue]) => {
    if (pointerValue === null) {
      return sequenceFactory_default.empty();
    }
    const pointer = pointerValue.value;
    const domFacade2 = executionParameters.domFacade;
    let result = "";
    function getChildIndex(child) {
      let i4 = 0;
      let otherChild = child;
      while (otherChild !== null) {
        if (areSameNode(child, otherChild, domFacade2)) {
          i4++;
        }
        otherChild = domFacade2.getPreviousSiblingPointer(otherChild, null);
      }
      return i4;
    }
    let ancestor;
    for (ancestor = pointer; executionParameters.domFacade.getParentNodePointer(
      ancestor,
      null
    ) !== null; ancestor = executionParameters.domFacade.getParentNodePointer(
      ancestor,
      null
    )) {
      switch (domFacade2.getNodeType(ancestor)) {
        case 1 /* ELEMENT_NODE */: {
          const ancestorElement = ancestor;
          result = `/Q{${domFacade2.getNamespaceURI(ancestorElement) || ""}}${domFacade2.getLocalName(ancestorElement)}[${getChildIndex(
            ancestorElement
          )}]${result}`;
          break;
        }
        case 2 /* ATTRIBUTE_NODE */: {
          const ancestorAttributeNode = ancestor;
          const attributeNameSpace = domFacade2.getNamespaceURI(ancestorAttributeNode) ? `Q{${domFacade2.getNamespaceURI(ancestorAttributeNode)}}` : "";
          result = `/@${attributeNameSpace}${domFacade2.getLocalName(
            ancestorAttributeNode
          )}${result}`;
          break;
        }
        case 3 /* TEXT_NODE */: {
          const ancestorTextNode = ancestor;
          result = `/text()[${getChildIndex(ancestorTextNode)}]${result}`;
          break;
        }
        case 7 /* PROCESSING_INSTRUCTION_NODE */: {
          const ancestorPI = ancestor;
          result = `/processing-instruction(${domFacade2.getTarget(
            ancestorPI
          )})[${getChildIndex(ancestorPI)}]${result}`;
          break;
        }
        case 8 /* COMMENT_NODE */: {
          const ancestorComment = ancestor;
          result = `/comment()[${getChildIndex(ancestorComment)}]${result}`;
          break;
        }
      }
    }
    if (domFacade2.getNodeType(ancestor) === 9 /* DOCUMENT_NODE */) {
      return sequenceFactory_default.create(createAtomicValue(result || "/", 1 /* XSSTRING */));
    }
    result = "Q{http://www.w3.org/2005/xpath-functions}root()" + result;
    return sequenceFactory_default.create(createAtomicValue(result, 1 /* XSSTRING */));
  });
};
var fnNamespaceURI = (_dynamicContext, executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (node) => createAtomicValue(
      executionParameters.domFacade.getNamespaceURI(node.value) || "",
      20 /* XSANYURI */
    )
  );
};
var fnLocalName = (_dynamicContext, executionParameters, _staticContext, sequence2) => {
  const domFacade2 = executionParameters.domFacade;
  return sequence2.switchCases({
    default: () => {
      return sequence2.map((node) => {
        if (domFacade2.getNodeType(node.value) === 7) {
          const pi = node.value;
          return createAtomicValue(domFacade2.getTarget(pi), 1 /* XSSTRING */);
        }
        return createAtomicValue(
          domFacade2.getLocalName(node.value) || "",
          1 /* XSSTRING */
        );
      });
    },
    empty: () => sequenceFactory_default.singleton(createAtomicValue("", 1 /* XSSTRING */))
  });
};
function contains(domFacade2, ancestor, descendant) {
  if (domFacade2.getNodeType(ancestor) === 2 /* ATTRIBUTE_NODE */) {
    return arePointersEqual_default(ancestor, descendant);
  }
  while (descendant) {
    if (arePointersEqual_default(ancestor, descendant)) {
      return true;
    }
    if (domFacade2.getNodeType(descendant) === 9 /* DOCUMENT_NODE */) {
      return false;
    }
    descendant = domFacade2.getParentNodePointer(descendant, null);
  }
  return false;
}
var fnOutermost = (_dynamicContext, executionParameters, _staticContext, nodeSequence) => {
  return nodeSequence.mapAll((allNodeValues) => {
    if (!allNodeValues.length) {
      return sequenceFactory_default.empty();
    }
    const resultNodes = sortNodeValues(executionParameters.domFacade, allNodeValues).reduce(
      (previousNodes, node, i4) => {
        if (i4 === 0) {
          previousNodes.push(node);
          return previousNodes;
        }
        if (contains(
          executionParameters.domFacade,
          previousNodes[previousNodes.length - 1].value,
          node.value
        )) {
          return previousNodes;
        }
        previousNodes.push(node);
        return previousNodes;
      },
      []
    );
    return sequenceFactory_default.create(resultNodes);
  }, 1 /* SKIP_DESCENDANTS */);
};
var fnInnermost = (_dynamicContext, executionParameters, _staticContext, nodeSequence) => {
  return nodeSequence.mapAll((allNodeValues) => {
    if (!allNodeValues.length) {
      return sequenceFactory_default.empty();
    }
    const resultNodes = sortNodeValues(
      executionParameters.domFacade,
      allNodeValues
    ).reduceRight((followingNodes, node, i4, allNodes) => {
      if (i4 === allNodes.length - 1) {
        followingNodes.push(node);
        return followingNodes;
      }
      if (contains(executionParameters.domFacade, node.value, followingNodes[0].value)) {
        return followingNodes;
      }
      followingNodes.unshift(node);
      return followingNodes;
    }, []);
    return sequenceFactory_default.create(resultNodes);
  });
};
var fnRoot = (_dynamicContext, executionParameters, _staticContext, nodeSequence) => {
  return nodeSequence.map((node) => {
    if (!isSubtypeOf(node.type, 53 /* NODE */)) {
      throw new Error("XPTY0004 Argument passed to fn:root() should be of the type node()");
    }
    let ancestor;
    let parent = node.value;
    while (parent) {
      ancestor = parent;
      parent = executionParameters.domFacade.getParentNodePointer(ancestor, null);
    }
    return createPointerValue(ancestor, executionParameters.domFacade);
  });
};
var declarations3 = [
  {
    argumentTypes: [{ type: 53 /* NODE */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnName,
    localName: "name",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [],
    callFunction: contextItemAsFirstArgument("name", 53 /* NODE */, fnName),
    localName: "name",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [{ type: 53 /* NODE */, mult: 3 /* EXACTLY_ONE */ }],
    callFunction: fnNamespaceURI,
    localName: "namespace-uri",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 20 /* XSANYURI */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [],
    callFunction: contextItemAsFirstArgument("namespace-uri", 53 /* NODE */, fnNamespaceURI),
    localName: "namespace-uri",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 20 /* XSANYURI */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [{ type: 53 /* NODE */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnInnermost,
    localName: "innermost",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 53 /* NODE */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [{ type: 53 /* NODE */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnOutermost,
    localName: "outermost",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 53 /* NODE */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [{ type: 53 /* NODE */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnHasChildren,
    localName: "has-children",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: {
      type: 0 /* XSBOOLEAN */,
      mult: 3 /* EXACTLY_ONE */
    }
  },
  {
    argumentTypes: [],
    callFunction: contextItemAsFirstArgument("has-children", 53 /* NODE */, fnHasChildren),
    localName: "has-children",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [{ type: 53 /* NODE */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnPath,
    localName: "path",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [],
    callFunction: contextItemAsFirstArgument("path", 53 /* NODE */, fnPath),
    localName: "path",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [{ type: 53 /* NODE */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnNodeName,
    localName: "node-name",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 23 /* XSQNAME */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [],
    callFunction: contextItemAsFirstArgument("node-name", 53 /* NODE */, fnNodeName),
    localName: "node-name",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 23 /* XSQNAME */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [{ type: 53 /* NODE */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnLocalName,
    localName: "local-name",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [],
    callFunction: contextItemAsFirstArgument("local-name", 53 /* NODE */, fnLocalName),
    localName: "local-name",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [{ type: 53 /* NODE */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnRoot,
    localName: "root",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 53 /* NODE */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [],
    callFunction: contextItemAsFirstArgument("root", 53 /* NODE */, fnRoot),
    localName: "root",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 53 /* NODE */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [],
    callFunction: contextItemAsFirstArgument("data", 59 /* ITEM */, fnData),
    localName: "data",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnData,
    localName: "data",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnLang,
    localName: "lang",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 53 /* NODE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: fnLang,
    localName: "lang",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [],
    callFunction: contextItemAsFirstArgument("generate-id", 53 /* NODE */, fnGenerateId),
    localName: "generate-id",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [{ type: 53 /* NODE */, mult: 0 /* ZERO_OR_ONE */ }],
    callFunction: fnGenerateId,
    localName: "generate-id",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  }
];
var builtInFunctions_node_default = {
  declarations: declarations3,
  functions: {
    name: fnName,
    nodeName: fnNodeName
  }
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_sequences_deepEqual.ts
var nodeName = builtInFunctions_node_default.functions.nodeName;
function asyncGenerateEvery(items, callback) {
  let i4 = 0;
  const l3 = items.length;
  let done = false;
  let filterGenerator = null;
  return {
    next: () => {
      if (!done) {
        while (i4 < l3) {
          if (!filterGenerator) {
            filterGenerator = callback(items[i4], i4, items);
          }
          const filterResult = filterGenerator.next(0 /* NONE */);
          filterGenerator = null;
          if (filterResult.value) {
            i4++;
            continue;
          }
          return ready(false);
        }
        done = true;
        return ready(true);
      }
      return DONE_TOKEN;
    }
  };
}
function filterElementAndTextNodes(node, domFacade2) {
  const nodeType = domFacade2.getNodeType(node);
  return nodeType === 1 /* ELEMENT_NODE */ || nodeType === 3 /* TEXT_NODE */;
}
function anyAtomicTypeDeepEqual(_dynamicContext, _executionParameters, _staticContext, item1, item2) {
  if ((isSubtypeOf(item1.type, 4 /* XSDECIMAL */) || isSubtypeOf(item1.type, 6 /* XSFLOAT */)) && (isSubtypeOf(item2.type, 4 /* XSDECIMAL */) || isSubtypeOf(item2.type, 6 /* XSFLOAT */))) {
    const temp1 = castToType(item1, 6 /* XSFLOAT */);
    const temp2 = castToType(item2, 6 /* XSFLOAT */);
    return temp1.value === temp2.value || isNaN(item1.value) && isNaN(item2.value);
  }
  if ((isSubtypeOf(item1.type, 4 /* XSDECIMAL */) || isSubtypeOf(item1.type, 6 /* XSFLOAT */) || isSubtypeOf(item1.type, 3 /* XSDOUBLE */)) && (isSubtypeOf(item2.type, 4 /* XSDECIMAL */) || isSubtypeOf(item2.type, 6 /* XSFLOAT */) || isSubtypeOf(item2.type, 3 /* XSDOUBLE */))) {
    const temp1 = castToType(item1, 3 /* XSDOUBLE */);
    const temp2 = castToType(item2, 3 /* XSDOUBLE */);
    return temp1.value === temp2.value || isNaN(item1.value) && isNaN(item2.value);
  }
  if (isSubtypeOf(item1.type, 23 /* XSQNAME */) && isSubtypeOf(item2.type, 23 /* XSQNAME */)) {
    return item1.value.namespaceURI === item2.value.namespaceURI && item1.value.localName === item2.value.localName;
  }
  if ((isSubtypeOf(item1.type, 9 /* XSDATETIME */) || isSubtypeOf(item1.type, 7 /* XSDATE */) || isSubtypeOf(item1.type, 8 /* XSTIME */) || isSubtypeOf(item1.type, 11 /* XSGYEARMONTH */) || isSubtypeOf(item1.type, 12 /* XSGYEAR */) || isSubtypeOf(item1.type, 13 /* XSGMONTHDAY */) || isSubtypeOf(item1.type, 14 /* XSGMONTH */) || isSubtypeOf(item1.type, 15 /* XSGDAY */)) && (isSubtypeOf(item2.type, 9 /* XSDATETIME */) || isSubtypeOf(item2.type, 7 /* XSDATE */) || isSubtypeOf(item2.type, 8 /* XSTIME */) || isSubtypeOf(item2.type, 11 /* XSGYEARMONTH */) || isSubtypeOf(item2.type, 12 /* XSGYEAR */) || isSubtypeOf(item2.type, 13 /* XSGMONTHDAY */) || isSubtypeOf(item2.type, 14 /* XSGMONTH */) || isSubtypeOf(item2.type, 15 /* XSGDAY */))) {
    return equal(item1.value, item2.value);
  }
  if ((isSubtypeOf(item1.type, 16 /* XSYEARMONTHDURATION */) || isSubtypeOf(item1.type, 17 /* XSDAYTIMEDURATION */) || isSubtypeOf(item1.type, 18 /* XSDURATION */)) && (isSubtypeOf(item2.type, 16 /* XSYEARMONTHDURATION */) || isSubtypeOf(item2.type, 17 /* XSDAYTIMEDURATION */) || isSubtypeOf(item2.type, 17 /* XSDAYTIMEDURATION */))) {
    return item1.value.equals(item2.value);
  }
  return item1.value === item2.value;
}
function compareNormalizedTextNodes(dynamicContext, executionParameters, staticContext, textValues1, textValues2) {
  const [atomicValue1, atomicValue2] = [textValues1, textValues2].map((textValues) => {
    const value = textValues.reduce((wholeValue, textValue) => {
      wholeValue = wholeValue + atomizeSingleValue(textValue, executionParameters).first().value;
      return wholeValue;
    }, "");
    return {
      type: 1 /* XSSTRING */,
      value
    };
  });
  return ready(
    anyAtomicTypeDeepEqual(
      dynamicContext,
      executionParameters,
      staticContext,
      atomicValue1,
      atomicValue2
    )
  );
}
function takeConsecutiveTextValues(item, textValues, iterator, domFacade2) {
  while (item.value && isSubtypeOf(item.value.type, 56 /* TEXT */)) {
    textValues.push(item.value);
    const nextSibling = domFacade2.getNextSiblingPointer(item.value.value);
    item = iterator.next(0 /* NONE */);
    if (nextSibling && domFacade2.getNodeType(nextSibling) !== 3 /* TEXT_NODE */) {
      break;
    }
  }
  return item;
}
function sequenceDeepEqual(dynamicContext, executionParameters, staticContext, sequence1, sequence2) {
  const domFacade2 = executionParameters.domFacade;
  const it1 = sequence1.value;
  const it2 = sequence2.value;
  let item1 = null;
  let item2 = null;
  let comparisonGenerator = null;
  let done;
  const textValues1 = [];
  const textValues2 = [];
  return {
    next: (_hint) => {
      while (!done) {
        if (!item1) {
          item1 = it1.next(0 /* NONE */);
        }
        item1 = takeConsecutiveTextValues(item1, textValues1, it1, domFacade2);
        if (!item2) {
          item2 = it2.next(0 /* NONE */);
        }
        item2 = takeConsecutiveTextValues(item2, textValues2, it2, domFacade2);
        if (textValues1.length || textValues2.length) {
          const textComparisonResult = compareNormalizedTextNodes(
            dynamicContext,
            executionParameters,
            staticContext,
            textValues1,
            textValues2
          );
          textValues1.length = 0;
          textValues2.length = 0;
          if (textComparisonResult.value === false) {
            done = true;
            return textComparisonResult;
          }
          continue;
        }
        if (item1.done || item2.done) {
          done = true;
          return ready(item1.done === item2.done);
        }
        if (!comparisonGenerator) {
          comparisonGenerator = itemDeepEqual(
            dynamicContext,
            executionParameters,
            staticContext,
            item1.value,
            item2.value
          );
        }
        const comparisonResult = comparisonGenerator.next(0 /* NONE */);
        comparisonGenerator = null;
        if (comparisonResult.value === false) {
          done = true;
          return comparisonResult;
        }
        item1 = null;
        item2 = null;
      }
      return DONE_TOKEN;
    }
  };
}
function mapTypeDeepEqual(dynamicContext, executionParameters, staticContext, item1, item2) {
  if (item1.keyValuePairs.length !== item2.keyValuePairs.length) {
    return createSingleValueIterator(false);
  }
  return asyncGenerateEvery(item1.keyValuePairs, (mapEntry1) => {
    const mapEntry2 = item2.keyValuePairs.find(
      (entry) => anyAtomicTypeDeepEqual(
        dynamicContext,
        executionParameters,
        staticContext,
        entry.key,
        mapEntry1.key
      )
    );
    if (!mapEntry2) {
      return createSingleValueIterator(false);
    }
    return sequenceDeepEqual(
      dynamicContext,
      executionParameters,
      staticContext,
      mapEntry1.value(),
      mapEntry2.value()
    );
  });
}
function arrayTypeDeepEqual(dynamicContext, executionParameters, staticContext, item1, item2) {
  if (item1.members.length !== item2.members.length) {
    return createSingleValueIterator(false);
  }
  return asyncGenerateEvery(item1.members, (arrayEntry1, index) => {
    const arrayEntry2 = item2.members[index];
    return sequenceDeepEqual(
      dynamicContext,
      executionParameters,
      staticContext,
      arrayEntry1(),
      arrayEntry2()
    );
  });
}
function nodeDeepEqual(dynamicContext, executionParameters, staticContext, item1, item2) {
  let item1Nodes = executionParameters.domFacade.getChildNodePointers(item1.value);
  let item2Nodes = executionParameters.domFacade.getChildNodePointers(item2.value);
  item1Nodes = item1Nodes.filter(
    (item1Node) => filterElementAndTextNodes(item1Node, executionParameters.domFacade)
  );
  item2Nodes = item2Nodes.filter(
    (item2Node) => filterElementAndTextNodes(item2Node, executionParameters.domFacade)
  );
  const item1NodesSeq = sequenceFactory_default.create(
    item1Nodes.map((node) => createPointerValue(node, executionParameters.domFacade))
  );
  const item2NodesSeq = sequenceFactory_default.create(
    item2Nodes.map((node) => createPointerValue(node, executionParameters.domFacade))
  );
  return sequenceDeepEqual(
    dynamicContext,
    executionParameters,
    staticContext,
    item1NodesSeq,
    item2NodesSeq
  );
}
function elementNodeDeepEqual(dynamicContext, executionParameters, staticContext, item1, item2) {
  const namesAreEqualResultGenerator = sequenceDeepEqual(
    dynamicContext,
    executionParameters,
    staticContext,
    nodeName(
      dynamicContext,
      executionParameters,
      staticContext,
      sequenceFactory_default.singleton(item1)
    ),
    nodeName(
      dynamicContext,
      executionParameters,
      staticContext,
      sequenceFactory_default.singleton(item2)
    )
  );
  const nodeDeepEqualGenerator = nodeDeepEqual(
    dynamicContext,
    executionParameters,
    staticContext,
    item1,
    item2
  );
  const domFacade2 = executionParameters.domFacade;
  const attributes1 = domFacade2.getAllAttributePointers(item1.value).filter(
    (attr) => domFacade2.getNamespaceURI(attr) !== "http://www.w3.org/2000/xmlns/" /* XMLNS_NAMESPACE_URI */
  ).sort(
    (attrA, attrB) => domFacade2.getNodeName(attrA) > domFacade2.getNodeName(attrB) ? 1 : -1
  ).map((attr) => createPointerValue(attr, executionParameters.domFacade));
  const attributes2 = executionParameters.domFacade.getAllAttributePointers(item2.value).filter(
    (attr) => domFacade2.getNamespaceURI(attr) !== "http://www.w3.org/2000/xmlns/" /* XMLNS_NAMESPACE_URI */
  ).sort(
    (attrA, attrB) => domFacade2.getNodeName(attrA) > domFacade2.getNodeName(attrB) ? 1 : -1
  ).map((attr) => createPointerValue(attr, executionParameters.domFacade));
  const attributesDeepEqualGenerator = sequenceDeepEqual(
    dynamicContext,
    executionParameters,
    staticContext,
    sequenceFactory_default.create(attributes1),
    sequenceFactory_default.create(attributes2)
  );
  let done = false;
  return {
    next: (_hint) => {
      if (done) {
        return DONE_TOKEN;
      }
      const namesAreEqualResult = namesAreEqualResultGenerator.next(0 /* NONE */);
      if (!namesAreEqualResult.done && namesAreEqualResult.value === false) {
        done = true;
        return namesAreEqualResult;
      }
      const attributesEqualResult = attributesDeepEqualGenerator.next(0 /* NONE */);
      if (!attributesEqualResult.done && attributesEqualResult.value === false) {
        done = true;
        return attributesEqualResult;
      }
      const contentsEqualResult = nodeDeepEqualGenerator.next(0 /* NONE */);
      done = true;
      return contentsEqualResult;
    }
  };
}
function atomicTypeNodeDeepEqual(dynamicContext, executionParameters, staticContext, item1, item2) {
  const namesAreEqualResultGenerator = sequenceDeepEqual(
    dynamicContext,
    executionParameters,
    staticContext,
    nodeName(
      dynamicContext,
      executionParameters,
      staticContext,
      sequenceFactory_default.singleton(item1)
    ),
    nodeName(
      dynamicContext,
      executionParameters,
      staticContext,
      sequenceFactory_default.singleton(item2)
    )
  );
  let done = false;
  return {
    next: (_hint) => {
      if (done) {
        return DONE_TOKEN;
      }
      const namesAreEqualResult = namesAreEqualResultGenerator.next(0 /* NONE */);
      if (!namesAreEqualResult.done) {
        if (namesAreEqualResult.value === false) {
          done = true;
          return namesAreEqualResult;
        }
      }
      return ready(
        anyAtomicTypeDeepEqual(
          dynamicContext,
          executionParameters,
          staticContext,
          atomizeSingleValue(item1, executionParameters).first(),
          atomizeSingleValue(item2, executionParameters).first()
        )
      );
    }
  };
}
function itemDeepEqual(dynamicContext, executionParameters, staticContext, item1, item2) {
  if (isSubtypeOf(item1.type, 46 /* XSANYATOMICTYPE */) && isSubtypeOf(item2.type, 46 /* XSANYATOMICTYPE */)) {
    return createSingleValueIterator(
      anyAtomicTypeDeepEqual(
        dynamicContext,
        executionParameters,
        staticContext,
        item1,
        item2
      )
    );
  }
  if (isSubtypeOf(item1.type, 61 /* MAP */) && isSubtypeOf(item2.type, 61 /* MAP */)) {
    return mapTypeDeepEqual(
      dynamicContext,
      executionParameters,
      staticContext,
      item1,
      item2
    );
  }
  if (isSubtypeOf(item1.type, 62 /* ARRAY */) && isSubtypeOf(item2.type, 62 /* ARRAY */)) {
    return arrayTypeDeepEqual(
      dynamicContext,
      executionParameters,
      staticContext,
      item1,
      item2
    );
  }
  if (isSubtypeOf(item1.type, 53 /* NODE */) && isSubtypeOf(item2.type, 53 /* NODE */)) {
    if (isSubtypeOf(item1.type, 55 /* DOCUMENTNODE */) && isSubtypeOf(item2.type, 55 /* DOCUMENTNODE */)) {
      return nodeDeepEqual(dynamicContext, executionParameters, staticContext, item1, item2);
    }
    if (isSubtypeOf(item1.type, 54 /* ELEMENT */) && isSubtypeOf(item2.type, 54 /* ELEMENT */)) {
      return elementNodeDeepEqual(
        dynamicContext,
        executionParameters,
        staticContext,
        item1,
        item2
      );
    }
    if (isSubtypeOf(item1.type, 47 /* ATTRIBUTE */) && isSubtypeOf(item2.type, 47 /* ATTRIBUTE */)) {
      return atomicTypeNodeDeepEqual(
        dynamicContext,
        executionParameters,
        staticContext,
        item1,
        item2
      );
    }
    if (isSubtypeOf(item1.type, 57 /* PROCESSINGINSTRUCTION */) && isSubtypeOf(item2.type, 57 /* PROCESSINGINSTRUCTION */)) {
      return atomicTypeNodeDeepEqual(
        dynamicContext,
        executionParameters,
        staticContext,
        item1,
        item2
      );
    }
    if (isSubtypeOf(item1.type, 58 /* COMMENT */) && isSubtypeOf(item2.type, 58 /* COMMENT */)) {
      return atomicTypeNodeDeepEqual(
        dynamicContext,
        executionParameters,
        staticContext,
        item1,
        item2
      );
    }
  }
  return createSingleValueIterator(false);
}
var builtInFunctions_sequences_deepEqual_default = sequenceDeepEqual;

// ../gh/fontoxpath/src/expressions/UnfocusableDynamicContext.ts
var UnfocusableDynamicContext = class extends DynamicContext_default {
  constructor(bindings) {
    super({
      contextItem: null,
      contextItemIndex: -1,
      contextSequence: sequenceFactory_default.empty(),
      variableBindings: bindings.variableBindings
    });
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/XQueryUpdateFacilityErrors.ts
var errXUST0001 = (message = "Can not execute an updating expression in a non-updating context.") => new Error(`XUST0001: ${message}`);
var errXUTY0004 = (node) => new Error(
  `XUTY0004: The attribute ${node.name}="${node.value}" follows a node that is not an attribute node.`
);
var errXUTY0005 = () => new Error(
  "XUTY0005: The target of a insert expression with into must be a single element or document node."
);
var errXUTY0006 = () => new Error(
  "XUTY0006: The target of a insert expression with before or after must be a single element, text, comment, or processing instruction node."
);
var errXUTY0007 = () => new Error(
  "XUTY0007: The target of a delete expression must be a sequence of zero or more nodes."
);
var errXUTY0008 = () => new Error(
  "XUTY0008: The target of a replace expression must be a single element, attribute, text, comment, or processing instruction node."
);
var errXUDY0009 = (target) => new Error(
  `XUDY0009: The target ${target.outerHTML} for replacing a node must have a parent.`
);
var errXUTY0010 = () => new Error(
  "XUTY0010: When replacing an an element, text, comment, or processing instruction node the new value must be a single node."
);
var errXUTY0011 = () => new Error(
  "XUTY0011: When replacing an attribute the new value must be zero or more attribute nodes."
);
var errXUTY0012 = () => new Error(
  "XUTY0012: The target of a rename expression must be a single element, attribute, or processing instruction node."
);
var errXUTY0013 = () => new Error(
  "XUTY0013: The source expression of a copy modify expression must return a single node."
);
var errXUDY0014 = (target) => new Error(
  `XUDY0014: The target ${target.outerHTML} must be a node created by the copy clause.`
);
var errXUDY0015 = (target) => new Error(
  `XUDY0015: The target ${target.outerHTML} is used in more than one rename expression.`
);
var errXUDY0016 = (target) => new Error(
  `XUDY0016: The target ${target.outerHTML} is used in more than one replace expression.`
);
var errXUDY0017 = (target) => new Error(
  `XUDY0017: The target ${target.outerHTML} is used in more than one replace value of expression.`
);
var errXUDY0021 = (constraint) => new Error(
  `XUDY0021: Applying the updates will result in the XDM instance violating constraint: '${constraint}'`
);
var errXUTY0022 = () => new Error(
  "XUTY0022: An insert expression specifies the insertion of an attribute node into a document node."
);
var errXUDY0023 = (namespaceURI) => new Error(`XUDY0023: The namespace binding ${namespaceURI} is conflicting.`);
var errXUDY0024 = (namespaceURI) => new Error(`XUDY0024: The namespace binding ${namespaceURI} is conflicting.`);
var errXUDY0027 = () => new Error(
  "XUDY0027: The target for an insert, replace, or rename expression expression should not be empty."
);
var errXUDY0029 = (target) => new Error(
  `XUDY0029: The target ${target.outerHTML} for inserting a node before or after must have a parent.`
);
var errXUDY0030 = () => new Error(
  "XUDY0030: An insert expression specifies the insertion of an attribute node before or after a child of a document node."
);
var errXUDY0037 = () => new Error(
  "XUDY0037: The modify expression of a copy modify expression can not contain a fn:put."
);
var errXUDY0038 = () => new Error(
  "XUDY0038: The function returned by the PrimaryExpr of a dynamic function invocation can not be an updating function"
);

// ../gh/fontoxpath/src/expressions/Expression.ts
var Expression = class {
  constructor(specificity, childExpressions, optimizationOptions = {
    canBeStaticallyEvaluated: false,
    peer: false,
    resultOrder: "unsorted" /* UNSORTED */,
    subtree: false
  }, canBeUpdating = false, type) {
    this.specificity = specificity;
    this.expectedResultOrder = optimizationOptions.resultOrder || "unsorted" /* UNSORTED */;
    this.subtree = !!optimizationOptions.subtree;
    this.peer = !!optimizationOptions.peer;
    this.canBeStaticallyEvaluated = !!optimizationOptions.canBeStaticallyEvaluated;
    this._childExpressions = childExpressions;
    this.isUpdating = false;
    this._eagerlyEvaluatedValue = null;
    this._canBeUpdating = canBeUpdating;
    this.type = type;
  }
  evaluateMaybeStatically(dynamicContext, executionParameters) {
    if (!dynamicContext || dynamicContext.contextItem === null) {
      return this.evaluate(dynamicContext, executionParameters);
    }
    if (this.canBeStaticallyEvaluated) {
      return this.evaluateWithoutFocus(dynamicContext, executionParameters);
    }
    return this.evaluate(dynamicContext, executionParameters);
  }
  /**
   * Retrieve the bucket name, if any, in which this selector can be presorted.
   *
   * Buckets can be used for quickly filtering a set of expressions to only those potentially
   * applicable to a given node. Use getBucketsForNode to determine the buckets to consider for a
   * given node.
   */
  getBucket() {
    return null;
  }
  performStaticEvaluation(staticContext) {
    this._childExpressions.forEach(
      (selector) => selector.performStaticEvaluation(staticContext)
    );
    if (!this._canBeUpdating && this._childExpressions.some((childExpression) => childExpression.isUpdating)) {
      throw errXUST0001();
    }
  }
  evaluateWithoutFocus(_contextlessDynamicContext, executionParameters) {
    if (this._eagerlyEvaluatedValue === null) {
      this._eagerlyEvaluatedValue = createDoublyIterableSequence(
        this.evaluate(
          new UnfocusableDynamicContext({
            variableBindings: {}
          }),
          executionParameters
        ).expandSequence()
      );
    }
    return this._eagerlyEvaluatedValue();
  }
};
var Expression_default = Expression;

// ../gh/fontoxpath/src/expressions/UpdatingExpressionResult.ts
var UpdatingExpressionResult = class {
  constructor(values, pendingUpdateList) {
    this.xdmValue = values;
    this.pendingUpdateList = pendingUpdateList;
  }
};

// ../gh/fontoxpath/src/nodesFactory/DomBackedNodesFactory.ts
var DomBackedNodesFactory = class {
  constructor(contextItem) {
    if (contextItem && typeof contextItem === "object" && "nodeType" in contextItem) {
      const ownerDocument = contextItem.ownerDocument || contextItem;
      if (typeof ownerDocument.createElementNS === "function" && typeof ownerDocument.createProcessingInstruction === "function" && typeof ownerDocument.createTextNode === "function" && typeof ownerDocument.createComment === "function") {
        this._documentNode = ownerDocument;
      }
    }
    if (!this._documentNode) {
      this._documentNode = null;
    }
  }
  createAttributeNS(namespaceURI, name2) {
    if (!this._documentNode) {
      throw new Error(
        "Please pass a node factory if an XQuery script uses node constructors"
      );
    }
    return this._documentNode.createAttributeNS(namespaceURI, name2);
  }
  createCDATASection(contents) {
    if (!this._documentNode) {
      throw new Error(
        "Please pass a node factory if an XQuery script uses node constructors"
      );
    }
    return this._documentNode.createCDATASection(contents);
  }
  createComment(contents) {
    if (!this._documentNode) {
      throw new Error(
        "Please pass a node factory if an XQuery script uses node constructors"
      );
    }
    return this._documentNode.createComment(contents);
  }
  createDocument() {
    if (!this._documentNode) {
      throw new Error(
        "Please pass a node factory if an XQuery script uses node constructors"
      );
    }
    return this._documentNode.implementation.createDocument(null, null, null);
  }
  createElementNS(namespaceURI, name2) {
    if (!this._documentNode) {
      throw new Error(
        "Please pass a node factory if an XQuery script uses node constructors"
      );
    }
    return this._documentNode.createElementNS(namespaceURI, name2);
  }
  createProcessingInstruction(target, data) {
    if (!this._documentNode) {
      throw new Error(
        "Please pass a node factory if an XQuery script uses node constructors"
      );
    }
    return this._documentNode.createProcessingInstruction(target, data);
  }
  createTextNode(contents) {
    if (!this._documentNode) {
      throw new Error(
        "Please pass a node factory if an XQuery script uses node constructors"
      );
    }
    return this._documentNode.createTextNode(contents);
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/applyPulPrimitives.ts
function hasAttribute(target, localName, namespace, domFacade2) {
  return domFacade2.getAllAttributePointers(target, `name-${localName}`).some(
    (attr) => domFacade2.getLocalName(attr) === localName && domFacade2.getNamespaceURI(attr) === namespace
  );
}
var deletePu = (target, domFacade2, documentWriter) => {
  const parentPointer = domFacade2.getParentNodePointer(target);
  const parent = parentPointer ? parentPointer.node : null;
  if (parent) {
    if (domFacade2.getNodeType(target) === 2 /* ATTRIBUTE_NODE */) {
      documentWriter.removeAttributeNS(
        parent,
        domFacade2.getNamespaceURI(target),
        domFacade2.getLocalName(target)
      );
    } else {
      documentWriter.removeChild(parent, target.node);
    }
  }
};
var insertAfter = (target, content, domFacade2, documentWriter) => {
  const parent = domFacade2.getParentNodePointer(target).node;
  const nextSiblingPointer = domFacade2.getNextSiblingPointer(target);
  const nextSibling = nextSiblingPointer ? nextSiblingPointer.node : null;
  content.forEach((pointer) => {
    documentWriter.insertBefore(parent, pointer.node, nextSibling);
  });
};
var insertBefore = (target, content, domFacade2, documentWriter) => {
  const parent = domFacade2.getParentNodePointer(target).node;
  content.forEach((pointer) => {
    documentWriter.insertBefore(parent, pointer.node, target.node);
  });
};
var insertInto = (target, content, documentWriter) => {
  insertIntoAsLast(target, content, documentWriter);
};
var insertIntoAsFirst = (target, content, domFacade2, documentWriter) => {
  const firstChildPointer = domFacade2.getFirstChildPointer(target);
  const firstChild = firstChildPointer ? firstChildPointer.node : null;
  content.forEach((pointer) => {
    documentWriter.insertBefore(target.node, pointer.node, firstChild);
  });
};
var insertIntoAsLast = (target, content, documentWriter) => {
  content.forEach((pointer) => {
    documentWriter.insertBefore(target.node, pointer.node, null);
  });
};
var insertAttributes = (target, content, domFacade2, documentWriter) => {
  content.forEach((attributeNodePointer) => {
    const attrLocalName = domFacade2.getLocalName(attributeNodePointer);
    const attrNamespace = domFacade2.getNamespaceURI(attributeNodePointer);
    if (hasAttribute(target, attrLocalName, attrNamespace, domFacade2)) {
      throw errXUDY0021(
        `An attribute ${attrNamespace ? `Q{${attrNamespace}}${attrLocalName}` : attrLocalName} already exists.`
      );
    }
    documentWriter.setAttributeNS(
      target.node,
      attrNamespace,
      attrLocalName,
      domFacade2.getDataFromPointer(attributeNodePointer)
    );
  });
};
var rename = (target, newName, domFacade2, nodesFactory, documentWriter) => {
  if (!nodesFactory) {
    nodesFactory = new DomBackedNodesFactory(target ? target.node : null);
  }
  let replacement;
  switch (domFacade2.getNodeType(target)) {
    case 1 /* ELEMENT_NODE */: {
      const attributes = domFacade2.getAllAttributes(
        target.node
      );
      const childNodes = domFacade2.getChildNodes(
        target.node
      );
      const replacementNode = nodesFactory.createElementNS(
        newName.namespaceURI,
        newName.buildPrefixedName()
      );
      replacement = { node: replacementNode, graftAncestor: null };
      attributes.forEach((attribute) => {
        documentWriter.setAttributeNS(
          replacementNode,
          attribute.namespaceURI,
          attribute.nodeName,
          attribute.value
        );
      });
      childNodes.forEach((childNode) => {
        documentWriter.insertBefore(replacementNode, childNode, null);
      });
      break;
    }
    case 2 /* ATTRIBUTE_NODE */: {
      const replacementAttr = nodesFactory.createAttributeNS(
        newName.namespaceURI,
        newName.buildPrefixedName()
      );
      replacementAttr.value = domFacade2.getDataFromPointer(target);
      replacement = { node: replacementAttr, graftAncestor: null };
      break;
    }
    case 7 /* PROCESSING_INSTRUCTION_NODE */: {
      replacement = {
        node: nodesFactory.createProcessingInstruction(
          newName.buildPrefixedName(),
          domFacade2.getDataFromPointer(target)
        ),
        graftAncestor: null
      };
      break;
    }
  }
  if (!domFacade2.getParentNodePointer(target)) {
    throw new Error("Not supported: renaming detached nodes.");
  }
  replaceNode(target, [replacement], domFacade2, documentWriter);
};
var replaceElementContent = (target, text, domFacade2, documentWriter) => {
  domFacade2.getChildNodes(target.node).forEach((child) => documentWriter.removeChild(target.node, child));
  if (text) {
    documentWriter.insertBefore(target.node, text.node, null);
  }
};
var replaceNode = (target, replacement, domFacade2, documentWriter) => {
  const parent = domFacade2.getParentNodePointer(target);
  const targetNodeType = domFacade2.getNodeType(target);
  if (targetNodeType === 2 /* ATTRIBUTE_NODE */) {
    const attrTarget = target;
    if (replacement.some(
      (candidate) => domFacade2.getNodeType(candidate) !== 2 /* ATTRIBUTE_NODE */
    )) {
      throw new Error(
        'Constraint "If $target is an attribute node, $replacement must consist of zero or more attribute nodes." failed.'
      );
    }
    const element = parent ? parent.node : null;
    documentWriter.removeAttributeNS(
      element,
      domFacade2.getNamespaceURI(attrTarget),
      domFacade2.getLocalName(attrTarget)
    );
    replacement.forEach((attr) => {
      const attrLocalName = domFacade2.getLocalName(attr);
      const attrNamespace = domFacade2.getNamespaceURI(attr);
      if (hasAttribute(parent, attrLocalName, attrNamespace, domFacade2)) {
        throw errXUDY0021(
          `An attribute ${attrNamespace ? `Q{${attrNamespace}}${attrLocalName}` : attrLocalName} already exists.`
        );
      }
      documentWriter.setAttributeNS(
        element,
        attrNamespace,
        attrLocalName,
        domFacade2.getDataFromPointer(attr)
      );
    });
  }
  if (targetNodeType === 1 /* ELEMENT_NODE */ || targetNodeType === 3 /* TEXT_NODE */ || targetNodeType === 8 /* COMMENT_NODE */ || targetNodeType === 7 /* PROCESSING_INSTRUCTION_NODE */) {
    const followingPointer = domFacade2.getNextSiblingPointer(target);
    const following = followingPointer ? followingPointer.node : null;
    documentWriter.removeChild(parent.node, target.node);
    replacement.forEach((newNode) => {
      documentWriter.insertBefore(parent.node, newNode.node, following);
    });
  }
};
var replaceValue = (target, stringValue, domFacade2, documentWriter) => {
  if (domFacade2.getNodeType(target) === 2 /* ATTRIBUTE_NODE */) {
    const element = domFacade2.getParentNodePointer(target);
    if (element) {
      documentWriter.setAttributeNS(
        element.node,
        domFacade2.getNamespaceURI(target),
        domFacade2.getLocalName(target),
        stringValue
      );
    } else {
      target.node.value = stringValue;
    }
  } else {
    documentWriter.setData(target.node, stringValue);
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pulRoutines.ts
var applyUpdates = (pul, _revalidationModule, _inheritNamespaces, domFacade2, nodesFactory, documentWriter) => {
  compatibilityCheck(pul, domFacade2);
  pul.filter(
    (pu) => ["insertInto", "insertAttributes", "replaceValue", "rename"].indexOf(pu.type) !== -1
  ).forEach((pu) => {
    switch (pu.type) {
      case "insertInto":
        const insertPu = pu;
        insertInto(insertPu.target, insertPu.content, documentWriter);
        break;
      case "insertAttributes":
        const insertAttributesPu = pu;
        insertAttributes(
          insertAttributesPu.target,
          insertAttributesPu.content,
          domFacade2,
          documentWriter
        );
        break;
      case "rename":
        const renamePu = pu;
        rename(renamePu.target, renamePu.newName, domFacade2, nodesFactory, documentWriter);
        break;
      case "replaceValue":
        const replaceValuePu = pu;
        replaceValue(
          replaceValuePu.target,
          replaceValuePu.stringValue,
          domFacade2,
          documentWriter
        );
        break;
    }
  });
  pul.filter(
    (pu) => ["insertBefore", "insertAfter", "insertIntoAsFirst", "insertIntoAsLast"].indexOf(
      pu.type
    ) !== -1
  ).forEach((pu) => {
    switch (pu.type) {
      case "insertAfter":
        const insertAfterPu = pu;
        insertAfter(insertAfterPu.target, insertAfterPu.content, domFacade2, documentWriter);
        break;
      case "insertBefore":
        const insertBeforePu = pu;
        insertBefore(
          insertBeforePu.target,
          insertBeforePu.content,
          domFacade2,
          documentWriter
        );
        break;
      case "insertIntoAsFirst":
        const insertAsFirstPu = pu;
        insertIntoAsFirst(
          insertAsFirstPu.target,
          insertAsFirstPu.content,
          domFacade2,
          documentWriter
        );
        break;
      case "insertIntoAsLast":
        const insertAsLastPu = pu;
        insertIntoAsLast(insertAsLastPu.target, insertAsLastPu.content, documentWriter);
        break;
    }
  });
  pul.filter((pu) => pu.type === "replaceNode").forEach((pu) => {
    const replacePu = pu;
    replaceNode(replacePu.target, replacePu.replacement, domFacade2, documentWriter);
  });
  pul.filter((pu) => pu.type === "replaceElementContent").forEach((pu) => {
    const replacePu = pu;
    replaceElementContent(replacePu.target, replacePu.text, domFacade2, documentWriter);
  });
  pul.filter((pu) => pu.type === "delete").forEach((pu) => {
    const deletePendingUpdate = pu;
    deletePu(deletePendingUpdate.target, domFacade2, documentWriter);
  });
  if (pul.some((pu) => pu.type === "put")) {
    throw new Error(
      'Not implemented: the execution for pendingUpdate "put" is not yet implemented.'
    );
  }
};
var compatibilityCheck = (pul, domFacade2) => {
  function findDuplicateTargets(type, onFoundDuplicate) {
    const targets = /* @__PURE__ */ new Set();
    pul.filter((pu) => pu.type === type).map((pu) => pu.target).forEach((target) => {
      const targetNode = target ? target.node : null;
      if (targets.has(targetNode)) {
        onFoundDuplicate(targetNode);
      }
      targets.add(targetNode);
    });
  }
  findDuplicateTargets("rename", (target) => {
    throw errXUDY0015(target);
  });
  findDuplicateTargets("replaceNode", (target) => {
    throw errXUDY0016(target);
  });
  findDuplicateTargets("replaceValue", (target) => {
    throw errXUDY0017(target);
  });
  findDuplicateTargets("replaceElementContent", (target) => {
    throw errXUDY0017(target);
  });
  const newQNamesByElement = /* @__PURE__ */ new Map();
  const getAttributeName = (attribute) => new QName_default(
    domFacade2.getPrefix(attribute),
    domFacade2.getNamespaceURI(attribute),
    domFacade2.getLocalName(attribute)
  );
  pul.filter(
    (pu) => pu.type === "replaceNode" && domFacade2.getNodeType(pu.target) === 2 /* ATTRIBUTE_NODE */
  ).forEach((pu) => {
    const elementPointer = domFacade2.getParentNodePointer(pu.target);
    const element = elementPointer ? elementPointer.node : null;
    const qNames = newQNamesByElement.get(element);
    if (qNames) {
      qNames.push(...pu.replacement.map(getAttributeName));
    } else {
      newQNamesByElement.set(element, pu.replacement.map(getAttributeName));
    }
  });
  pul.filter(
    (pu) => pu.type === "rename" && domFacade2.getNodeType(pu.target) === 2 /* ATTRIBUTE_NODE */
  ).forEach((pu) => {
    const elementPointer = domFacade2.getParentNodePointer(pu.target);
    if (!elementPointer) {
      return;
    }
    const element = elementPointer.node;
    const qNames = newQNamesByElement.get(element);
    if (qNames) {
      qNames.push(pu.newName);
    } else {
      newQNamesByElement.set(element, [pu.newName]);
    }
  });
  newQNamesByElement.forEach((qNames, _element) => {
    const prefixes = {};
    qNames.forEach((qName2) => {
      if (!prefixes[qName2.prefix]) {
        prefixes[qName2.prefix] = qName2.namespaceURI;
      }
      if (prefixes[qName2.prefix] !== qName2.namespaceURI) {
        throw errXUDY0024(qName2.namespaceURI);
      }
    });
  });
};
var mergeUpdates = (pul1, ...puls) => {
  return pul1.concat(...puls.filter(Boolean));
};

// ../gh/fontoxpath/src/expressions/xquery-update/UpdatingExpression.ts
var UpdatingExpression = class extends Expression_default {
  constructor(specificity, childExpressions, optimizationOptions, type) {
    super(specificity, childExpressions, optimizationOptions, true, type);
    this.isUpdating = true;
  }
  evaluate(_dynamicContext, _executionParameters) {
    throw errXUST0001();
  }
  ensureUpdateListWrapper(expression) {
    if (expression.isUpdating) {
      const updatingExpression = expression;
      return (dynamicContext, executionParameters) => updatingExpression.evaluateWithUpdateList(dynamicContext, executionParameters);
    }
    return (dynamicContext, executionParameters) => {
      const sequence2 = expression.evaluate(dynamicContext, executionParameters);
      return {
        next: () => {
          const allValues = sequence2.getAllValues();
          return ready({
            pendingUpdateList: [],
            xdmValue: allValues
          });
        }
      };
    };
  }
};
var UpdatingExpression_default = UpdatingExpression;

// ../gh/fontoxpath/src/expressions/PossiblyUpdatingExpression.ts
function separateXDMValueFromUpdatingExpressionResult(updatingExpressionResultIterator, outputPUL) {
  const itResult = updatingExpressionResultIterator.next(0 /* NONE */);
  outputPUL(itResult.value.pendingUpdateList);
  const allValues = itResult.value.xdmValue;
  return sequenceFactory_default.create(allValues);
}
var PossiblyUpdatingExpression = class extends UpdatingExpression_default {
  constructor(specificity, childExpressions, optimizationOptions, type) {
    super(specificity, childExpressions, optimizationOptions, type);
    this.isUpdating = this._childExpressions.some(
      (childExpression) => childExpression.isUpdating
    );
  }
  evaluate(dynamicContext, executionParameters) {
    return this.performFunctionalEvaluation(
      dynamicContext,
      executionParameters,
      this._childExpressions.map(
        (expr) => (innerDynamicContext) => expr.evaluate(innerDynamicContext, executionParameters)
      )
    );
  }
  evaluateWithUpdateList(dynamicContext, executionParameters) {
    let updateList = [];
    const sequence2 = this.performFunctionalEvaluation(
      dynamicContext,
      executionParameters,
      this._childExpressions.map((expr) => {
        if (!expr.isUpdating) {
          return (innerDynamicContext) => expr.evaluate(innerDynamicContext, executionParameters);
        }
        return (innerDynamicContext) => {
          const updatingExpression = expr;
          const updateListAndValue = updatingExpression.evaluateWithUpdateList(
            innerDynamicContext,
            executionParameters
          );
          return separateXDMValueFromUpdatingExpressionResult(
            updateListAndValue,
            (pendingUpdates) => updateList = mergeUpdates(updateList, pendingUpdates)
          );
        };
      })
    );
    let done = false;
    return {
      next: (_hint) => {
        if (done) {
          return DONE_TOKEN;
        }
        const allValues = sequence2.getAllValues();
        done = true;
        return ready(new UpdatingExpressionResult(allValues, updateList));
      }
    };
  }
  performStaticEvaluation(staticContext) {
    super.performStaticEvaluation(staticContext);
    this.determineUpdatingness();
  }
  /**
   * Some expressions (mainly function calls) determine their updatingness during static
   * evaluation. Propagate this
   */
  determineUpdatingness() {
    if (this._childExpressions.some((expr) => expr.isUpdating)) {
      this.isUpdating = true;
    }
  }
};

// ../gh/fontoxpath/src/expressions/Specificity.ts
var SPECIFICITY_DIMENSIONS = ["external", "attribute", "nodeName", "nodeType", "universal"];
var NUMBER_OF_SPECIFICITY_DIMENSIONS = SPECIFICITY_DIMENSIONS.length;
var _Specificity = class _Specificity {
  constructor(countsByKind) {
    this._counts = SPECIFICITY_DIMENSIONS.map((specificityKind) => {
      return countsByKind[specificityKind] || 0;
    });
    if (Object.keys(countsByKind).some((kind) => !SPECIFICITY_DIMENSIONS.includes(kind))) {
      throw new Error("Invalid specificity kind passed");
    }
  }
  /**
   * @return  new specificity with the combined counts
   */
  add(otherSpecificity) {
    const sum = SPECIFICITY_DIMENSIONS.reduce((countsByKind, specificityKind, index) => {
      countsByKind[specificityKind] = this._counts[index] + otherSpecificity._counts[index];
      return countsByKind;
    }, /* @__PURE__ */ Object.create(null));
    return new _Specificity(sum);
  }
  /**
   * @return  -1 if specificity is less than otherSpecificity, 1 if it is greater, 0 if equal
   */
  compareTo(otherSpecificity) {
    for (let i4 = 0; i4 < NUMBER_OF_SPECIFICITY_DIMENSIONS; ++i4) {
      if (otherSpecificity._counts[i4] < this._counts[i4]) {
        return 1;
      }
      if (otherSpecificity._counts[i4] > this._counts[i4]) {
        return -1;
      }
    }
    return 0;
  }
};
_Specificity.ATTRIBUTE_KIND = "attribute";
_Specificity.EXTERNAL_KIND = "external";
_Specificity.NODENAME_KIND = "nodeName";
_Specificity.NODETYPE_KIND = "nodeType";
_Specificity.UNIVERSAL_KIND = "universal";
var Specificity = _Specificity;
var Specificity_default = Specificity;

// ../gh/fontoxpath/src/expressions/functions/FunctionCall.ts
var functionXPTY0004 = () => errXPTY0004(
  "Expected base expression of a function call to evaluate to a sequence of single function item"
);
function transformArgumentList(argumentTypes, argumentList, executionParameters, functionItem) {
  const transformedArguments = [];
  for (let i4 = 0; i4 < argumentList.length; ++i4) {
    if (argumentList[i4] === null) {
      transformedArguments.push(null);
      continue;
    }
    const transformedArgument = performFunctionConversion(
      argumentTypes[i4],
      argumentList[i4],
      executionParameters,
      functionItem,
      false
    );
    transformedArguments.push(transformedArgument);
  }
  return transformedArguments;
}
function validateFunctionItem(item, callArity) {
  if (!isSubtypeOf(item.type, 60 /* FUNCTION */)) {
    throw errXPTY0004("Expected base expression to evaluate to a function item");
  }
  const functionItem = item;
  if (functionItem.getArity() !== callArity) {
    throw functionXPTY0004();
  }
  return functionItem;
}
function callFunction(functionItem, functionCall2, dynamicContext, executionParameters, isGapByOffset, createArgumentSequences, staticContext) {
  let argumentOffset = 0;
  const evaluatedArgs = isGapByOffset.map((isGap) => {
    if (isGap) {
      return null;
    }
    return createArgumentSequences[argumentOffset++](dynamicContext);
  });
  const transformedArguments = transformArgumentList(
    functionItem.getArgumentTypes(),
    evaluatedArgs,
    executionParameters,
    functionItem.getName()
  );
  if (transformedArguments.indexOf(null) >= 0) {
    return functionItem.applyArguments(transformedArguments);
  }
  const toReturn = functionCall2.apply(void 0, [
    dynamicContext,
    executionParameters,
    staticContext,
    ...transformedArguments
  ]);
  return performFunctionConversion(
    functionItem.getReturnType(),
    toReturn,
    executionParameters,
    functionItem.getName(),
    true
  );
}
var FunctionCall = class extends PossiblyUpdatingExpression {
  /**
   * @param  functionReference  Reference to the function to execute.
   * @param  args               The arguments to be evaluated and passed to the function
   */
  constructor(functionReference, args, type) {
    super(
      new Specificity_default({
        [Specificity_default.EXTERNAL_KIND]: 1
      }),
      [functionReference].concat(args.filter((arg) => !!arg)),
      {
        resultOrder: "unsorted" /* UNSORTED */,
        peer: false,
        subtree: false,
        canBeStaticallyEvaluated: false
        // args.every(arg => arg.canBeStaticallyEvaluated) && functionReference.canBeStaticallyEvaluated
      },
      type
    );
    this._callArity = args.length;
    this._isGapByOffset = args.map((arg) => arg === null);
    this._staticContext = null;
    this._functionReferenceExpression = functionReference;
    this._argumentExpressions = args;
  }
  evaluateWithUpdateList(dynamicContext, executionParameters) {
    if (!this._functionReference || !this._functionReference.isUpdating) {
      return super.evaluateWithUpdateList(dynamicContext, executionParameters);
    }
    let pendingUpdateList = [];
    const functionCall2 = (innerDynamicContext, innerExecutionParameters, staticContext, ...args) => {
      return separateXDMValueFromUpdatingExpressionResult(
        this._functionReference.value(
          innerDynamicContext,
          innerExecutionParameters,
          staticContext,
          ...args
        ),
        (pendingUpdates) => {
          pendingUpdateList = mergeUpdates(pendingUpdateList, pendingUpdates);
        }
      );
    };
    const returnSequence = callFunction(
      this._functionReference,
      functionCall2,
      dynamicContext,
      executionParameters,
      this._isGapByOffset,
      this._argumentExpressions.map((expr) => () => {
        if (!expr.isUpdating) {
          return expr.evaluateMaybeStatically(dynamicContext, executionParameters);
        }
        return separateXDMValueFromUpdatingExpressionResult(
          expr.evaluateWithUpdateList(
            dynamicContext,
            executionParameters
          ),
          (pendingUpdates) => {
            pendingUpdateList = mergeUpdates(pendingUpdateList, pendingUpdates);
          }
        );
      }),
      this._staticContext
    );
    let done = false;
    return {
      next: () => {
        if (done) {
          return DONE_TOKEN;
        }
        const allValues = returnSequence.getAllValues();
        done = true;
        return ready({
          pendingUpdateList,
          xdmValue: allValues
        });
      }
    };
  }
  performFunctionalEvaluation(dynamicContext, executionParameters, [createFunctionReferenceSequence, ...createArgumentSequences]) {
    if (this._functionReference) {
      return callFunction(
        this._functionReference,
        (innerDynamicContext, innerExecutionParameters, staticContext, ...args) => this._functionReference.value(
          innerDynamicContext,
          innerExecutionParameters,
          staticContext,
          ...args
        ),
        dynamicContext,
        executionParameters,
        this._isGapByOffset,
        createArgumentSequences,
        this._staticContext
      );
    }
    const sequence2 = createFunctionReferenceSequence(dynamicContext);
    return sequence2.switchCases({
      default: () => {
        throw functionXPTY0004();
      },
      singleton: () => {
        return sequence2.mapAll(([item]) => {
          const functionItem = validateFunctionItem(item, this._callArity);
          if (functionItem.isUpdating) {
            throw errXUDY0038();
          }
          return callFunction(
            functionItem,
            functionItem.value,
            dynamicContext,
            executionParameters,
            this._isGapByOffset,
            createArgumentSequences,
            this._staticContext
          );
        });
      }
    });
  }
  performStaticEvaluation(staticContext) {
    this._staticContext = staticContext.cloneContext();
    super.performStaticEvaluation(staticContext);
    if (this._functionReferenceExpression.canBeStaticallyEvaluated) {
      const functionRefSequence = this._functionReferenceExpression.evaluateMaybeStatically(
        null,
        null
      );
      if (!functionRefSequence.isSingleton()) {
        throw functionXPTY0004();
      }
      this._functionReference = validateFunctionItem(
        functionRefSequence.first(),
        this._callArity
      );
      if (this._functionReference.isUpdating) {
        this.isUpdating = true;
      }
    }
  }
};
var FunctionCall_default = FunctionCall;

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_arrays.ts
var arraySize = (_dynamicContext, _executionParameters, _staticContext, arraySequence) => {
  return zipSingleton(
    [arraySequence],
    ([array]) => sequenceFactory_default.singleton(
      createAtomicValue(array.members.length, 5 /* XSINTEGER */)
    )
  );
};
var arrayPut = (_dynamicContext, _executionParameters, _staticContext, arraySequence, positionSequence, itemSequence) => {
  return zipSingleton([positionSequence, arraySequence], ([position, array]) => {
    const positionValue = position.value;
    if (positionValue <= 0 || positionValue > array.members.length) {
      throw new Error("FOAY0001: array position out of bounds.");
    }
    const newMembers = array.members.concat();
    newMembers.splice(positionValue - 1, 1, createDoublyIterableSequence(itemSequence));
    return sequenceFactory_default.singleton(new ArrayValue_default(newMembers));
  });
};
var arrayAppend = (_dynamicContext, _executionParameters, _staticContext, arraySequence, itemSequence) => {
  return zipSingleton([arraySequence], ([array]) => {
    const newMembers = array.members.concat([
      createDoublyIterableSequence(itemSequence)
    ]);
    return sequenceFactory_default.singleton(new ArrayValue_default(newMembers));
  });
};
var arraySubarray = (_dynamicContext, _executionParameters, _staticContext, arraySequence, startSequence, lengthSequence) => {
  return zipSingleton(
    [arraySequence, startSequence, lengthSequence],
    ([array, start, length]) => {
      const startValue = start.value;
      const lengthValue = length.value;
      if (startValue > array.members.length || startValue <= 0) {
        throw new Error("FOAY0001: subarray start out of bounds.");
      }
      if (lengthValue < 0) {
        throw new Error("FOAY0002: subarray length out of bounds.");
      }
      if (startValue + lengthValue > array.members.length + 1) {
        throw new Error("FOAY0001: subarray start + length out of bounds.");
      }
      const newMembers = array.members.slice(
        startValue - 1,
        lengthValue + startValue - 1
      );
      return sequenceFactory_default.singleton(new ArrayValue_default(newMembers));
    }
  );
};
var arrayRemove = (_dynamicContext, _executionParameters, _staticContext, arraySequence, positionSequence) => {
  return zipSingleton(
    [arraySequence],
    ([array]) => positionSequence.mapAll((allIndices) => {
      const indicesToRemove = allIndices.map((value) => value.value).sort((a4, b3) => b3 - a4).filter((item, i4, all) => all[i4 - 1] !== item);
      const newMembers = array.members.concat();
      for (let i4 = 0, l3 = indicesToRemove.length; i4 < l3; ++i4) {
        const position = indicesToRemove[i4];
        if (position > array.members.length || position <= 0) {
          throw new Error("FOAY0001: subarray position out of bounds.");
        }
        newMembers.splice(position - 1, 1);
      }
      return sequenceFactory_default.singleton(new ArrayValue_default(newMembers));
    })
  );
};
var arrayInsertBefore = (_dynamicContext, _executionParameters, _staticContext, arraySequence, positionSequence, itemSequence) => {
  return zipSingleton([arraySequence, positionSequence], ([array, position]) => {
    const positionValue = position.value;
    if (positionValue > array.members.length + 1 || positionValue <= 0) {
      throw new Error("FOAY0001: subarray position out of bounds.");
    }
    const newMembers = array.members.concat();
    newMembers.splice(positionValue - 1, 0, createDoublyIterableSequence(itemSequence));
    return sequenceFactory_default.singleton(new ArrayValue_default(newMembers));
  });
};
var arrayReverse = (_dynamicContext, _executionParameters, _staticContext, arraySequence) => {
  return zipSingleton(
    [arraySequence],
    ([array]) => sequenceFactory_default.singleton(new ArrayValue_default(array.members.concat().reverse()))
  );
};
var arrayJoin = (_dynamicContext, _executionParameters, _staticContext, arraySequence) => {
  return arraySequence.mapAll((allArrays) => {
    const newMembers = allArrays.reduce(
      (joinedMembers, array) => joinedMembers.concat(array.members),
      []
    );
    return sequenceFactory_default.singleton(new ArrayValue_default(newMembers));
  });
};
var arrayForEach = (dynamicContext, executionParameters, staticContext, arraySequence, itemSequence) => {
  return zipSingleton([arraySequence, itemSequence], ([array, item]) => {
    const itemFunctionValue = item;
    if (itemFunctionValue.getArity() !== 1) {
      throw errXPTY0004("The callback passed into array:for-each has a wrong arity.");
    }
    const newMembers = array.members.map((member) => {
      return createDoublyIterableSequence(
        itemFunctionValue.value.call(
          void 0,
          dynamicContext,
          executionParameters,
          staticContext,
          transformArgumentList(
            itemFunctionValue.getArgumentTypes(),
            [member()],
            executionParameters,
            "array:for-each"
          )[0]
        )
      );
    });
    return sequenceFactory_default.singleton(new ArrayValue_default(newMembers));
  });
};
var arrayFilter = (dynamicContext, executionParameters, staticContext, arraySequence, itemSequence) => {
  return zipSingleton([arraySequence, itemSequence], ([array, item]) => {
    const itemFunctionValue = item;
    if (itemFunctionValue.getArity() !== 1) {
      throw errXPTY0004("The callback passed into array:filter has a wrong arity.");
    }
    const filterResultSequences = array.members.map((member) => {
      const castArgument = transformArgumentList(
        itemFunctionValue.getArgumentTypes(),
        [member()],
        executionParameters,
        "array:filter"
      )[0];
      const callFunction2 = item.value;
      return callFunction2(dynamicContext, executionParameters, staticContext, castArgument);
    });
    const effectiveBooleanValues = [];
    let done = false;
    return sequenceFactory_default.create({
      next: () => {
        if (done) {
          return DONE_TOKEN;
        }
        for (let i4 = 0, l3 = array.members.length; i4 < l3; ++i4) {
          const filterResult = filterResultSequences[i4];
          const ebv = filterResult.getEffectiveBooleanValue();
          effectiveBooleanValues[i4] = ebv;
        }
        const newMembers = array.members.filter(
          (_2, i4) => effectiveBooleanValues[i4]
        );
        done = true;
        return ready(new ArrayValue_default(newMembers));
      }
    });
  });
};
var arrayFoldLeft = (dynamicContext, executionParameters, staticContext, arraySequence, startSequence, itemSequence) => {
  return zipSingleton([arraySequence, itemSequence], ([array, item]) => {
    const itemFunctionValue = item;
    if (itemFunctionValue.getArity() !== 2) {
      throw errXPTY0004("The callback passed into array:fold-left has a wrong arity.");
    }
    return array.members.reduce((accum, member) => {
      const castMember = transformArgumentList(
        itemFunctionValue.getArgumentTypes(),
        [member()],
        executionParameters,
        "array:fold-left"
      )[0];
      return item.value.call(
        void 0,
        dynamicContext,
        executionParameters,
        staticContext,
        accum,
        castMember
      );
    }, startSequence);
  });
};
var arrayFoldRight = (dynamicContext, executionParameters, staticContext, arraySequence, startSequence, itemSequence) => {
  return zipSingleton([arraySequence, itemSequence], ([array, item]) => {
    const itemFunctionValue = item;
    if (itemFunctionValue.getArity() !== 2) {
      throw errXPTY0004("The callback passed into array:fold-right has a wrong arity.");
    }
    return array.members.reduceRight((accum, member) => {
      const castMember = transformArgumentList(
        itemFunctionValue.getArgumentTypes(),
        [member()],
        executionParameters,
        "array:fold-right"
      )[0];
      return item.value.call(
        void 0,
        dynamicContext,
        executionParameters,
        staticContext,
        accum,
        castMember
      );
    }, startSequence);
  });
};
var arrayForEachPair = (dynamicContext, executionParameters, staticContext, arraySequenceA, arraySequenceB, itemSequence) => {
  return zipSingleton(
    [arraySequenceA, arraySequenceB, itemSequence],
    ([arrayA, arrayB, item]) => {
      const itemFunctionValue = item;
      if (itemFunctionValue.getArity() !== 2) {
        throw errXPTY0004(
          "The callback passed into array:for-each-pair has a wrong arity."
        );
      }
      const newMembers = [];
      for (let i4 = 0, l3 = Math.min(
        arrayA.members.length,
        arrayB.members.length
      ); i4 < l3; ++i4) {
        const [argumentA, argumentB] = transformArgumentList(
          itemFunctionValue.getArgumentTypes(),
          [arrayA.members[i4](), arrayB.members[i4]()],
          executionParameters,
          "array:for-each-pair"
        );
        newMembers[i4] = createDoublyIterableSequence(
          itemFunctionValue.value.call(
            void 0,
            dynamicContext,
            executionParameters,
            staticContext,
            argumentA,
            argumentB
          )
        );
      }
      return sequenceFactory_default.singleton(new ArrayValue_default(newMembers));
    }
  );
};
var isString = (type) => {
  return isSubtypeOf(type, 1 /* XSSTRING */) || isSubtypeOf(type, 20 /* XSANYURI */) || isSubtypeOf(type, 19 /* XSUNTYPEDATOMIC */);
};
var deepLessThan = (dynamicContext, executionParameters, staticContext, valuesA, valuesB) => {
  if (valuesA.length === 0) {
    return valuesB.length !== 0;
  } else if (valuesB.length !== 0 && itemDeepEqual(
    dynamicContext,
    executionParameters,
    staticContext,
    valuesA[0],
    valuesB[0]
  ).next(0 /* NONE */).value) {
    return deepLessThan(
      dynamicContext,
      executionParameters,
      staticContext,
      valuesA.slice(1),
      valuesB.slice(1)
    );
  } else if (valuesA[0].value !== valuesA[0].value) {
    return true;
  } else if (isString(valuesA[0].type) && valuesB.length !== 0 && isString(valuesB[0].type)) {
    return valuesA[0].value < valuesB[0].value;
  } else {
    return valuesB.length === 0 ? false : valuesA[0].value < valuesB[0].value;
  }
};
var arraySortCallback = (dynamicContext, executionParameters, staticContext, allValues) => {
  allValues.sort((valuesA, valuesB) => {
    const areSequencesEqual = builtInFunctions_sequences_deepEqual_default(
      dynamicContext,
      executionParameters,
      staticContext,
      sequenceFactory_default.create(valuesA),
      sequenceFactory_default.create(valuesB)
    ).next(0 /* NONE */).value;
    if (areSequencesEqual) {
      return 0;
    }
    return deepLessThan(dynamicContext, executionParameters, staticContext, valuesA, valuesB) ? -1 : 1;
  });
  return sequenceFactory_default.singleton(
    new ArrayValue_default(allValues.map((item) => () => sequenceFactory_default.create(item)))
  );
};
var arraySort = (dynamicContext, executionParameters, staticContext, arraySequence) => {
  return zipSingleton([arraySequence], ([array]) => {
    const allValues = array.members.map((i4) => i4().getAllValues());
    return arraySortCallback(dynamicContext, executionParameters, staticContext, allValues);
  });
};
function flattenItem(item) {
  if (isSubtypeOf(item.type, 62 /* ARRAY */)) {
    const arrayItem = item;
    return concatSequences(
      arrayItem.members.map(
        (member) => member().mapAll((subItems) => concatSequences(subItems.map(flattenItem)))
      )
    );
  }
  return sequenceFactory_default.singleton(item);
}
var arrayFlatten = (_dynamicContext, _executionParameters, _staticContext, itemSequence) => {
  return itemSequence.mapAll((items) => concatSequences(items.map(flattenItem)));
};
var declarations4 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "size",
    argumentTypes: [{ type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arraySize
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "get",
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: builtInFunctions_arrays_get_default
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "put",
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arrayPut
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "append",
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arrayAppend
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "subarray",
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arraySubarray
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "subarray",
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction(dynamicContext, executionParameters, staticContext, arraySequence, startSequence) {
      const lengthSequence = sequenceFactory_default.singleton(
        createAtomicValue(
          arraySequence.first().value.length - startSequence.first().value + 1,
          5 /* XSINTEGER */
        )
      );
      return arraySubarray(
        dynamicContext,
        executionParameters,
        staticContext,
        arraySequence,
        startSequence,
        lengthSequence
      );
    }
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "remove",
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arrayRemove
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "insert-before",
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arrayInsertBefore
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "head",
    argumentTypes: [{ type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ }],
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction(dynamicContext, executionParameters, _staticContext, arraySequence) {
      return builtInFunctions_arrays_get_default(
        dynamicContext,
        executionParameters,
        _staticContext,
        arraySequence,
        sequenceFactory_default.singleton(createAtomicValue(1, 5 /* XSINTEGER */))
      );
    }
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "tail",
    argumentTypes: [{ type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ }],
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction(dynamicContext, executionParameters, _staticContext, arraySequence) {
      return arrayRemove(
        dynamicContext,
        executionParameters,
        _staticContext,
        arraySequence,
        sequenceFactory_default.singleton(createAtomicValue(1, 5 /* XSINTEGER */))
      );
    }
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "reverse",
    argumentTypes: [{ type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ }],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arrayReverse
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "join",
    argumentTypes: [{ type: 62 /* ARRAY */, mult: 2 /* ZERO_OR_MORE */ }],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arrayJoin
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "for-each",
    // TODO: reimplement type checking by parsing the types
    // argumentTypes: ['array(*)', '(item()*) as item()*)]
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arrayForEach
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "filter",
    // TODO: reimplement type checking by parsing the types
    // argumentTypes: ['array(*)', '(item()*) as xs:boolean)]
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arrayFilter
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "fold-left",
    // TODO: reimplement type checking by parsing the types
    // argumentTypes: ['array(*)', 'item()*', '(item()*, item()*) as item())]
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: arrayFoldLeft
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "fold-right",
    // TODO: reimplement type checking by parsing the types
    // argumentTypes: ['array(*)', 'item()*', '(item()*, item()*) as item())]
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: arrayFoldRight
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "for-each-pair",
    // TODO: reimplement type checking by parsing the types
    // argumentTypes: ['array(*)', 'item()*', '(item()*, item()*) as item())]
    argumentTypes: [
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arrayForEachPair
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "sort",
    argumentTypes: [{ type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ }],
    returnType: { type: 62 /* ARRAY */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: arraySort
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/array" /* ARRAY_NAMESPACE_URI */,
    localName: "flatten",
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: arrayFlatten
  }
];
var builtInFunctions_arrays_default = {
  declarations: declarations4,
  s: {
    append: arrayAppend,
    flatten: arrayFlatten,
    foldLeft: arrayFoldLeft,
    foldRight: arrayFoldRight,
    forEach: arrayForEach,
    forEachPair: arrayForEachPair,
    filter: arrayFilter,
    get: builtInFunctions_arrays_get_default,
    insertBefore: arrayInsertBefore,
    join: arrayJoin,
    put: arrayPut,
    remove: arrayRemove,
    reverse: arrayReverse,
    size: arraySize,
    sort: arraySort,
    subArray: arraySubarray
  }
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_boolean.ts
var fnNot = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  const ebv = sequence2.getEffectiveBooleanValue();
  return ebv === false ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
};
var fnBoolean = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  const ebv = sequence2.getEffectiveBooleanValue();
  return ebv ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
};
var fnTrue = () => {
  return sequenceFactory_default.singletonTrueSequence();
};
var fnFalse = () => {
  return sequenceFactory_default.singletonFalseSequence();
};
var declarations5 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "boolean",
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnBoolean
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "true",
    argumentTypes: [],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnTrue
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "not",
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnNot
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "false",
    argumentTypes: [],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnFalse
  }
];
var builtInFunctions_boolean_default = {
  declarations: declarations5,
  functions: {
    ["boolean"]: fnBoolean,
    true: fnTrue,
    false: fnFalse,
    not: fnNot
  }
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_context.ts
var fnLast = (dynamicContext) => {
  if (dynamicContext.contextItem === null) {
    throw errXPDY0002("The fn:last() function depends on dynamic context, which is absent.");
  }
  let done = false;
  return sequenceFactory_default.create(
    {
      next: () => {
        if (done) {
          return DONE_TOKEN;
        }
        const length = dynamicContext.contextSequence.getLength();
        done = true;
        return ready(createAtomicValue(length, 5 /* XSINTEGER */));
      }
    },
    1
  );
};
var fnPosition = (dynamicContext) => {
  if (dynamicContext.contextItem === null) {
    throw errXPDY0002(
      "The fn:position() function depends on dynamic context, which is absent."
    );
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(dynamicContext.contextItemIndex + 1, 5 /* XSINTEGER */)
  );
};
var fnCurrentDateTime = (dynamicContext) => {
  return sequenceFactory_default.singleton(
    createAtomicValue(dynamicContext.getCurrentDateTime(), 10 /* XSDATETIMESTAMP */)
  );
};
var fnCurrentDate = (dynamicContext) => {
  return sequenceFactory_default.singleton(
    createAtomicValue(
      dynamicContext.getCurrentDateTime().convertToType(7 /* XSDATE */),
      7 /* XSDATE */
    )
  );
};
var fnCurrentTime = (dynamicContext) => {
  return sequenceFactory_default.singleton(
    createAtomicValue(
      dynamicContext.getCurrentDateTime().convertToType(8 /* XSTIME */),
      8 /* XSTIME */
    )
  );
};
var fnImplicitTimezone = (dynamicContext) => {
  return sequenceFactory_default.singleton(
    createAtomicValue(dynamicContext.getImplicitTimezone(), 17 /* XSDAYTIMEDURATION */)
  );
};
var declarations6 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "last",
    argumentTypes: [],
    returnType: { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnLast
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "position",
    argumentTypes: [],
    returnType: { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnPosition
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "current-dateTime",
    argumentTypes: [],
    returnType: { type: 10 /* XSDATETIMESTAMP */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnCurrentDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "current-date",
    argumentTypes: [],
    returnType: { type: 7 /* XSDATE */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnCurrentDate
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "current-time",
    argumentTypes: [],
    returnType: { type: 8 /* XSTIME */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnCurrentTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "implicit-timezone",
    argumentTypes: [],
    returnType: {
      type: 17 /* XSDAYTIMEDURATION */,
      mult: 3 /* EXACTLY_ONE */
    },
    callFunction: fnImplicitTimezone
  }
];
var builtInFunctions_context_default = {
  declarations: declarations6,
  functions: {
    last: fnLast,
    position: fnPosition
  }
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_dataTypeConstructors.ts
function genericDataTypeConstructor(dataType, _dynamicContext, _executionParameters, _staticContext, sequence2) {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(castToType(sequence2.first(), dataType));
}
var xsQName = (_dynamicContext, _executionParameters, staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  const value = sequence2.first();
  if (isSubtypeOf(value.type, 2 /* XSNUMERIC */)) {
    throw new Error("XPTY0004: The provided QName is not a string-like value.");
  }
  let lexicalQName = castToType(value, 1 /* XSSTRING */).value;
  lexicalQName = normalizeWhitespace(lexicalQName, 23 /* XSQNAME */);
  if (!validatePattern(lexicalQName, 23 /* XSQNAME */)) {
    throw new Error("FORG0001: The provided QName is invalid.");
  }
  if (!lexicalQName.includes(":")) {
    const resolvedDefaultNamespaceURI = staticContext.resolveNamespace("");
    return sequenceFactory_default.singleton(
      createAtomicValue(
        new QName_default("", resolvedDefaultNamespaceURI, lexicalQName),
        23 /* XSQNAME */
      )
    );
  }
  const [prefix2, localName] = lexicalQName.split(":");
  const namespaceURI = staticContext.resolveNamespace(prefix2);
  if (!namespaceURI) {
    throw new Error(
      `FONS0004: The value ${lexicalQName} can not be cast to a QName. Did you mean to use fn:QName?`
    );
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(new QName_default(prefix2, namespaceURI, localName), 23 /* XSQNAME */)
  );
};
var declarations7 = [
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "untypedAtomic",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 19 /* XSUNTYPEDATOMIC */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      19 /* XSUNTYPEDATOMIC */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "error",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: {
      type: 39 /* XSERROR */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: genericDataTypeConstructor.bind(
      null,
      39 /* XSERROR */
    )
  },
  // AnySimpleType cannot be instantiated
  // AnyAtomicType cannot be instantiated
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "string",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      1 /* XSSTRING */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "boolean",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      0 /* XSBOOLEAN */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "decimal",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 4 /* XSDECIMAL */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      4 /* XSDECIMAL */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "float",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 6 /* XSFLOAT */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      6 /* XSFLOAT */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "double",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      3 /* XSDOUBLE */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "duration",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 18 /* XSDURATION */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      18 /* XSDURATION */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "dateTime",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 9 /* XSDATETIME */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      9 /* XSDATETIME */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "dateTimeStamp",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 10 /* XSDATETIMESTAMP */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      10 /* XSDATETIMESTAMP */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "time",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 8 /* XSTIME */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      8 /* XSTIME */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "date",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 7 /* XSDATE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      7 /* XSDATE */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "gYearMonth",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 11 /* XSGYEARMONTH */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      11 /* XSGYEARMONTH */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "gYear",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 12 /* XSGYEAR */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      12 /* XSGYEAR */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "gMonthDay",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 13 /* XSGMONTHDAY */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      13 /* XSGMONTHDAY */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "gDay",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 15 /* XSGDAY */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      15 /* XSGDAY */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "gMonth",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 14 /* XSGMONTH */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      14 /* XSGMONTH */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "hexBinary",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 22 /* XSHEXBINARY */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      22 /* XSHEXBINARY */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "base64Binary",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 21 /* XSBASE64BINARY */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      21 /* XSBASE64BINARY */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "QName",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 23 /* XSQNAME */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: xsQName
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "anyURI",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 20 /* XSANYURI */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      20 /* XSANYURI */
    )
  },
  // NOTATION cannot be instantiated
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "normalizedString",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: {
      type: 48 /* XSNORMALIZEDSTRING */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: genericDataTypeConstructor.bind(
      null,
      48 /* XSNORMALIZEDSTRING */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "token",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 52 /* XSTOKEN */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      52 /* XSTOKEN */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "language",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 51 /* XSLANGUAGE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      51 /* XSLANGUAGE */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "NMTOKEN",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 50 /* XSNMTOKEN */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      50 /* XSNMTOKEN */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "NMTOKENS",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 49 /* XSNMTOKENS */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      49 /* XSNMTOKENS */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "Name",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 25 /* XSNAME */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      25 /* XSNAME */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "NCName",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 24 /* XSNCNAME */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      24 /* XSNCNAME */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "ID",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 42 /* XSID */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      42 /* XSID */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "IDREF",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 41 /* XSIDREF */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      41 /* XSIDREF */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "IDREFS",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 43 /* XSIDREFS */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      43 /* XSIDREFS */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "ENTITY",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 26 /* XSENTITY */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      26 /* XSENTITY */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "ENTITIES",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 40 /* XSENTITIES */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      40 /* XSENTITIES */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "integer",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      5 /* XSINTEGER */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "nonPositiveInteger",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: {
      type: 27 /* XSNONPOSITIVEINTEGER */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: genericDataTypeConstructor.bind(
      null,
      27 /* XSNONPOSITIVEINTEGER */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "negativeInteger",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: {
      type: 28 /* XSNEGATIVEINTEGER */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: genericDataTypeConstructor.bind(
      null,
      28 /* XSNEGATIVEINTEGER */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "long",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 31 /* XSLONG */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      31 /* XSLONG */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "int",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 32 /* XSINT */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      32 /* XSINT */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "short",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 33 /* XSSHORT */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      33 /* XSSHORT */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "byte",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 34 /* XSBYTE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      34 /* XSBYTE */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "nonNegativeInteger",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: {
      type: 30 /* XSNONNEGATIVEINTEGER */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: genericDataTypeConstructor.bind(
      null,
      30 /* XSNONNEGATIVEINTEGER */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "unsignedLong",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 36 /* XSUNSIGNEDLONG */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      36 /* XSUNSIGNEDLONG */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "unsignedInt",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 35 /* XSUNSIGNEDINT */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      35 /* XSUNSIGNEDINT */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "unsignedShort",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 38 /* XSUNSIGNEDSHORT */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      38 /* XSUNSIGNEDSHORT */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "unsignedByte",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 37 /* XSUNSIGNEDBYTE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      37 /* XSUNSIGNEDBYTE */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "positiveInteger",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: {
      type: 29 /* XSPOSITIVEINTEGER */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: genericDataTypeConstructor.bind(
      null,
      29 /* XSPOSITIVEINTEGER */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "yearMonthDuration",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: {
      type: 16 /* XSYEARMONTHDURATION */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: genericDataTypeConstructor.bind(
      null,
      16 /* XSYEARMONTHDURATION */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "dayTimeDuration",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: {
      type: 17 /* XSDAYTIMEDURATION */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: genericDataTypeConstructor.bind(
      null,
      17 /* XSDAYTIMEDURATION */
    )
  },
  {
    namespaceURI: "http://www.w3.org/2001/XMLSchema" /* XMLSCHEMA_NAMESPACE_URI */,
    localName: "dateTimeStamp",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 10 /* XSDATETIMESTAMP */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: genericDataTypeConstructor.bind(
      null,
      10 /* XSDATETIMESTAMP */
    )
  }
];
var builtInFunctions_dataTypeConstructors_default = {
  declarations: declarations7
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_datetime.ts
var fnDateTime = (_dynamicContext, _executionParameters, _staticContext, sequence2, arg2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  if (arg2.isEmpty()) {
    return arg2;
  }
  const date = sequence2.first().value;
  const time = arg2.first().value;
  const dateTimezone = date.getTimezone();
  const timeTimezone = time.getTimezone();
  let timezoneToUse;
  if (!dateTimezone && !timeTimezone) {
    timezoneToUse = null;
  } else if (dateTimezone && !timeTimezone) {
    timezoneToUse = dateTimezone;
  } else if (!dateTimezone && timeTimezone) {
    timezoneToUse = timeTimezone;
  } else if (dateTimezone.equals(timeTimezone)) {
    timezoneToUse = dateTimezone;
  } else {
    throw new Error(
      "FORG0008: fn:dateTime: got a date and time value with different timezones."
    );
  }
  const dateTime = new DateTime_default(
    date.getYear(),
    date.getMonth(),
    date.getDay(),
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getSecondFraction(),
    timezoneToUse
  );
  return sequenceFactory_default.singleton(createAtomicValue(dateTime, 9 /* XSDATETIME */));
};
var fnYearFromDateTime = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getYear(), 5 /* XSINTEGER */)
  );
};
var fnMonthFromDateTime = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getMonth(), 5 /* XSINTEGER */)
  );
};
var fnDayFromDateTime = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getDay(), 5 /* XSINTEGER */)
  );
};
var fnHoursFromDateTime = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getHours(), 5 /* XSINTEGER */)
  );
};
var fnMinutesFromDateTime = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getMinutes(), 5 /* XSINTEGER */)
  );
};
var fnSecondsFromDateTime = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getFullSeconds(), 4 /* XSDECIMAL */)
  );
};
var fnTimezoneFromDateTime = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  const timezone = sequence2.first().value.getTimezone();
  if (!timezone) {
    return sequenceFactory_default.empty();
  }
  return sequenceFactory_default.singleton(createAtomicValue(timezone, 17 /* XSDAYTIMEDURATION */));
};
var declarations8 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "dateTime",
    argumentTypes: [
      { type: 7 /* XSDATE */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 8 /* XSTIME */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 9 /* XSDATETIME */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "year-from-dateTime",
    argumentTypes: [{ type: 9 /* XSDATETIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnYearFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "month-from-dateTime",
    argumentTypes: [{ type: 9 /* XSDATETIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnMonthFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "day-from-dateTime",
    argumentTypes: [{ type: 9 /* XSDATETIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnDayFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "hours-from-dateTime",
    argumentTypes: [{ type: 9 /* XSDATETIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnHoursFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "minutes-from-dateTime",
    argumentTypes: [{ type: 9 /* XSDATETIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnMinutesFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "seconds-from-dateTime",
    argumentTypes: [{ type: 9 /* XSDATETIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 4 /* XSDECIMAL */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnSecondsFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "timezone-from-dateTime",
    argumentTypes: [{ type: 9 /* XSDATETIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: {
      type: 17 /* XSDAYTIMEDURATION */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: fnTimezoneFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "year-from-date",
    argumentTypes: [{ type: 7 /* XSDATE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnYearFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "month-from-date",
    argumentTypes: [{ type: 7 /* XSDATE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnMonthFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "day-from-date",
    argumentTypes: [{ type: 7 /* XSDATE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnDayFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "timezone-from-date",
    argumentTypes: [{ type: 7 /* XSDATE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: {
      type: 17 /* XSDAYTIMEDURATION */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: fnTimezoneFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "hours-from-time",
    argumentTypes: [{ type: 8 /* XSTIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnHoursFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "minutes-from-time",
    argumentTypes: [{ type: 8 /* XSTIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnMinutesFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "seconds-from-time",
    argumentTypes: [{ type: 8 /* XSTIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 4 /* XSDECIMAL */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnSecondsFromDateTime
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "timezone-from-time",
    argumentTypes: [{ type: 8 /* XSTIME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: {
      type: 17 /* XSDAYTIMEDURATION */,
      mult: 0 /* ZERO_OR_ONE */
    },
    callFunction: fnTimezoneFromDateTime
  }
];
var builtInFunctions_datetime_default = {
  declarations: declarations8
};

// ../gh/fontoxpath/src/domClone/deepCloneNode.ts
function deepCloneNode(pointer, executionParameters) {
  const domFacade2 = executionParameters.domFacade;
  const nodesFactory = executionParameters.nodesFactory;
  const documentWriter = executionParameters.documentWriter;
  switch (domFacade2.getNodeType(pointer)) {
    case 1 /* ELEMENT_NODE */:
      const cloneElem = nodesFactory.createElementNS(
        domFacade2.getNamespaceURI(pointer),
        domFacade2.getNodeName(pointer)
      );
      domFacade2.getAllAttributes(pointer.node).forEach(
        (attr) => documentWriter.setAttributeNS(
          cloneElem,
          attr.namespaceURI,
          attr.nodeName,
          attr.value
        )
      );
      for (const child of domFacade2.getChildNodePointers(pointer)) {
        const descendant = deepCloneNode(child, executionParameters);
        documentWriter.insertBefore(
          cloneElem,
          descendant.node,
          null
        );
      }
      const elementNodePointer = { node: cloneElem, graftAncestor: null };
      return elementNodePointer;
    case 2 /* ATTRIBUTE_NODE */:
      const cloneAttr = nodesFactory.createAttributeNS(
        domFacade2.getNamespaceURI(pointer),
        domFacade2.getNodeName(pointer)
      );
      cloneAttr.value = domFacade2.getDataFromPointer(pointer);
      const attributeNodePointer = {
        node: cloneAttr,
        graftAncestor: null
      };
      return attributeNodePointer;
    case 4 /* CDATA_SECTION_NODE */:
      const characterDataNodePointer = {
        node: nodesFactory.createCDATASection(
          domFacade2.getDataFromPointer(pointer)
        ),
        graftAncestor: null
      };
      return characterDataNodePointer;
    case 8 /* COMMENT_NODE */:
      const commentNodePointer = {
        node: nodesFactory.createComment(
          domFacade2.getDataFromPointer(pointer)
        ),
        graftAncestor: null
      };
      return commentNodePointer;
    case 9 /* DOCUMENT_NODE */:
      const cloneDoc = nodesFactory.createDocument();
      for (const child of domFacade2.getChildNodePointers(pointer)) {
        const descendant = deepCloneNode(child, executionParameters);
        documentWriter.insertBefore(
          cloneDoc,
          descendant.node,
          null
        );
      }
      const documentNodePointer = {
        node: cloneDoc,
        graftAncestor: null
      };
      return documentNodePointer;
    case 7 /* PROCESSING_INSTRUCTION_NODE */:
      const processingInstructionNodePointer = {
        node: nodesFactory.createProcessingInstruction(
          domFacade2.getTarget(pointer),
          domFacade2.getDataFromPointer(pointer)
        ),
        graftAncestor: null
      };
      return processingInstructionNodePointer;
    case 3 /* TEXT_NODE */:
      const textNodePointer = {
        node: nodesFactory.createTextNode(
          domFacade2.getDataFromPointer(pointer)
        ),
        graftAncestor: null
      };
      return textNodePointer;
  }
}

// ../gh/fontoxpath/src/domClone/realizeDom.ts
function createNewNode(pointer, executionParameters) {
  const documentWriter = executionParameters.documentWriter;
  const nodesFactory = executionParameters.nodesFactory;
  const domFacade2 = executionParameters.domFacade;
  const node = pointer.node;
  if (isTinyNode(node)) {
    switch (domFacade2.getNodeType(pointer)) {
      case 2 /* ATTRIBUTE_NODE */:
        const newAttributePointer = pointer;
        const newAttributeNode = nodesFactory.createAttributeNS(
          domFacade2.getNamespaceURI(newAttributePointer),
          domFacade2.getNodeName(newAttributePointer)
        );
        newAttributeNode.value = domFacade2.getDataFromPointer(newAttributePointer);
        return newAttributeNode;
      case 8 /* COMMENT_NODE */:
        return nodesFactory.createComment(
          domFacade2.getDataFromPointer(pointer)
        );
      case 1 /* ELEMENT_NODE */:
        const elementNodePointer = pointer;
        const namespaceURI = domFacade2.getNamespaceURI(elementNodePointer);
        const prefix2 = domFacade2.getPrefix(elementNodePointer);
        const localName = domFacade2.getLocalName(elementNodePointer);
        const element = nodesFactory.createElementNS(
          namespaceURI,
          prefix2 ? prefix2 + ":" + localName : localName
        );
        domFacade2.getChildNodePointers(elementNodePointer).forEach((childPointer) => {
          const newChildNode = createNewNode(childPointer, executionParameters);
          documentWriter.insertBefore(element, newChildNode, null);
        });
        domFacade2.getAllAttributePointers(elementNodePointer).forEach((attributePointer) => {
          documentWriter.setAttributeNS(
            element,
            domFacade2.getNamespaceURI(attributePointer),
            domFacade2.getNodeName(attributePointer),
            domFacade2.getDataFromPointer(attributePointer)
          );
        });
        element.normalize();
        return element;
      case 7 /* PROCESSING_INSTRUCTION_NODE */:
        const pIPointer = pointer;
        return nodesFactory.createProcessingInstruction(
          domFacade2.getTarget(pIPointer),
          domFacade2.getDataFromPointer(pIPointer)
        );
      case 3 /* TEXT_NODE */:
        return nodesFactory.createTextNode(
          domFacade2.getDataFromPointer(pointer)
        );
    }
  } else {
    return deepCloneNode(pointer, executionParameters).node;
  }
}
function getRootPointer(pointer, pathToNodeFromRoot, domFacade2) {
  let rootPointer = pointer;
  let parentPointer = domFacade2.getParentNodePointer(
    rootPointer
  );
  while (parentPointer !== null) {
    if (domFacade2.getNodeType(rootPointer) === 2 /* ATTRIBUTE_NODE */) {
      pathToNodeFromRoot.push(domFacade2.getNodeName(rootPointer));
    } else {
      const children = domFacade2.getChildNodePointers(parentPointer);
      pathToNodeFromRoot.push(
        children.findIndex((child) => arePointersEqual_default(child, rootPointer))
      );
    }
    rootPointer = parentPointer;
    parentPointer = domFacade2.getParentNodePointer(
      rootPointer
    );
  }
  return rootPointer;
}
function getNodeFromRoot(rootPointer, pathToNodeFromRoot, domFacade2) {
  let child = rootPointer;
  while (pathToNodeFromRoot.length > 0) {
    const childIndex = pathToNodeFromRoot.pop();
    if (typeof childIndex === "string") {
      const attributes = domFacade2.getAllAttributePointers(child);
      child = attributes.find((attr) => domFacade2.getNodeName(attr) === childIndex);
    } else {
      const children = domFacade2.getChildNodePointers(child);
      child = children[childIndex];
    }
  }
  return child.node;
}
function realizeDom(pointer, executionParameters, forceCreateClone) {
  const node = pointer.node;
  if (!(isTinyNode(node) || forceCreateClone || pointer.graftAncestor)) {
    return node;
  }
  const rootPointerByRootNode = executionParameters.rootPointerByRootNodeMap;
  const pathToNodeFromRoot = [];
  if (forceCreateClone) {
    return createNewNode(pointer, executionParameters);
  }
  const rootPointer = getRootPointer(pointer, pathToNodeFromRoot, executionParameters.domFacade);
  let newRootPointer = rootPointerByRootNode.get(rootPointer.node);
  if (!newRootPointer) {
    newRootPointer = {
      node: createNewNode(rootPointer, executionParameters),
      graftAncestor: null
    };
    rootPointerByRootNode.set(rootPointer.node, newRootPointer);
  }
  return getNodeFromRoot(newRootPointer, pathToNodeFromRoot, executionParameters.domFacade);
}

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_debugging.ts
var fnTrace = (_dynamicContext, executionParameters, _staticContext, arg, label) => {
  return arg.mapAll((allItems) => {
    let newMessage = "";
    for (let i4 = 0; i4 < allItems.length; i4++) {
      const value = allItems[i4];
      const argumentAsString = executionParameters.xmlSerializer && isSubtypeOf(value.type, 53 /* NODE */) ? executionParameters.xmlSerializer.serializeToString(
        realizeDom(
          value.value,
          executionParameters,
          false
        )
      ) : atomize(sequenceFactory_default.singleton(value), executionParameters).map((atomizedValue) => castToType(atomizedValue, 1 /* XSSTRING */)).first()?.value;
      if (argumentAsString) {
        newMessage += `{type: ${valueTypeToString(
          value.type
        )}, value: ${argumentAsString}}
`;
      }
    }
    if (label !== void 0) {
      newMessage += label.first().value;
    }
    executionParameters.logger.trace(newMessage);
    return sequenceFactory_default.create(allItems);
  });
};
var declarations9 = [
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnTrace,
    localName: "trace",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: fnTrace,
    localName: "trace",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  }
];
var builtInFunctions_debugging_default = {
  declarations: declarations9
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_duration.ts
var fnYearsFromDuration = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getYears(), 5 /* XSINTEGER */)
  );
};
var fnMonthsFromDuration = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getMonths(), 5 /* XSINTEGER */)
  );
};
var fnDaysFromDuration = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getDays(), 5 /* XSINTEGER */)
  );
};
var fnHoursFromDuration = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getHours(), 5 /* XSINTEGER */)
  );
};
var fnMinutesFromDuration = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getMinutes(), 5 /* XSINTEGER */)
  );
};
var fnSecondsFromDuration = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(sequence2.first().value.getSeconds(), 4 /* XSDECIMAL */)
  );
};
var declarations10 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "years-from-duration",
    argumentTypes: [{ type: 18 /* XSDURATION */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnYearsFromDuration
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "months-from-duration",
    argumentTypes: [{ type: 18 /* XSDURATION */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnMonthsFromDuration
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "days-from-duration",
    argumentTypes: [{ type: 18 /* XSDURATION */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnDaysFromDuration
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "hours-from-duration",
    argumentTypes: [{ type: 18 /* XSDURATION */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnHoursFromDuration
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "minutes-from-duration",
    argumentTypes: [{ type: 18 /* XSDURATION */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnMinutesFromDuration
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "seconds-from-duration",
    argumentTypes: [{ type: 18 /* XSDURATION */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 4 /* XSDECIMAL */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnSecondsFromDuration
  }
];
var builtInFunctions_duration_default = {
  declarations: declarations10
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_error.ts
var fnError = (_dynamicContext, _executionParameters, _staticContext, code, description) => {
  const codeQName = code === void 0 || code.isEmpty() ? new QName_default("err", "http://www.w3.org/2005/xqt-errors", "FOER0000") : code.first().value;
  let descriptionMessage = "";
  if (description !== void 0 && !description.isEmpty()) {
    descriptionMessage = `: ${description.first().value}`;
  }
  throw new Error(`${codeQName.localName}${descriptionMessage}`);
};
var declarations11 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "error",
    argumentTypes: [],
    returnType: { type: 63 /* NONE */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnError
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "error",
    argumentTypes: [{ type: 23 /* XSQNAME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 63 /* NONE */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnError
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "error",
    argumentTypes: [
      { type: 23 /* XSQNAME */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 63 /* NONE */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnError
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "error",
    argumentTypes: [
      { type: 23 /* XSQNAME */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    returnType: { type: 63 /* NONE */, mult: 3 /* EXACTLY_ONE */ },
    callFunction(_dynamicContext, _executionParameters, _staticContext, _input, _pattern, _flags) {
      throw new Error("Not implemented: Using an error object in error is not supported");
    }
  }
];
var builtInFunctions_error_default = {
  declarations: declarations11,
  functions: {
    error: fnError
  }
};

// ../gh/fontoxpath/src/parsing/evaluableExpressionToString.ts
function evaluableExpressionToString(evaluableExpression) {
  if (typeof evaluableExpression === "string") {
    return evaluableExpression;
  } else {
    const domFacade2 = new ExternalDomFacade();
    const childNodes = domFacade2.getChildNodes(evaluableExpression);
    const commentNode = childNodes.find(
      (node) => node.nodeType === 8 /* COMMENT_NODE */
    );
    return commentNode ? commentNode.data : "some expression";
  }
}

// ../gh/fontoxpath/src/evaluationUtils/PositionedError.ts
var PositionedError = class extends Error {
  constructor(message, position) {
    super(message);
    this.position = {
      end: {
        column: position.end.column,
        line: position.end.line,
        offset: position.end.offset
      },
      start: {
        column: position.start.column,
        line: position.start.line,
        offset: position.start.offset
      }
    };
  }
};

// ../gh/fontoxpath/src/evaluationUtils/printAndRethrowError.ts
function getNumberStringLength(i4) {
  return Math.floor(Math.log10(i4)) + 1;
}
function printAndRethrowError(selector, error) {
  if (error instanceof Error) {
    throw error;
  }
  if (typeof selector !== "string") {
    selector = evaluableExpressionToString(selector);
  }
  const stackEntry = error;
  const errorLocation = stackEntry.getErrorLocation();
  const rawLines = selector.replace(/\r/g, "").split("\n");
  const lineNumberStringLength = getNumberStringLength(
    Math.min(errorLocation.end.line + 2, rawLines.length)
  );
  const lines = rawLines.reduce((markedLines, line, i4) => {
    const lineNumber = i4 + 1;
    if (errorLocation.start.line - lineNumber > 2 || lineNumber - errorLocation.end.line > 2) {
      return markedLines;
    }
    const prefix2 = `${Array(lineNumberStringLength).fill(" ", 0, getNumberStringLength(lineNumber) - lineNumberStringLength).join("")}${lineNumber}: `;
    markedLines.push(`${prefix2}${line}`);
    if (lineNumber >= errorLocation.start.line && lineNumber <= errorLocation.end.line) {
      const endColumn = lineNumber < errorLocation.end.line ? line.length + prefix2.length : errorLocation.end.column - 1 + prefix2.length;
      const startColumn = lineNumber > errorLocation.start.line ? prefix2.length : errorLocation.start.column - 1 + prefix2.length;
      const mark = " ".repeat(prefix2.length) + // To preserve alignment, mirror any tabs in line in the indentation of the mark
      Array.from(
        line.substring(0, startColumn - prefix2.length),
        (c3) => c3 === "	" ? "	" : " "
      ).join("") + "^".repeat(endColumn - startColumn);
      markedLines.push(mark);
    }
    return markedLines;
  }, []);
  const stackTrace2 = stackEntry.makeStackTrace().join("\n");
  const errorMessage = lines.join("\n") + "\n\n" + stackTrace2;
  throw new PositionedError(errorMessage, errorLocation);
}

// ../gh/fontoxpath/src/expressions/functions/functionRegistry.ts
var registeredFunctionsByName = /* @__PURE__ */ Object.create(null);
function computeLevenshteinDistance(a4, b3) {
  const computedDistances = /* @__PURE__ */ new Map();
  for (let i4 = 0; i4 < a4.length + 1; ++i4) {
    computedDistances.set(i4, /* @__PURE__ */ new Map());
  }
  return (function computeStep(aLen, bLen) {
    if (aLen === 0) {
      return bLen;
    }
    if (bLen === 0) {
      return aLen;
    }
    if (computedDistances.get(aLen).has(bLen)) {
      return computedDistances.get(aLen).get(bLen);
    }
    let cost = 0;
    if (a4[aLen - 1] !== b3[bLen - 1]) {
      cost = 1;
    }
    const distance = Math.min(
      computeStep(aLen - 1, bLen) + 1,
      computeStep(aLen, bLen - 1) + 1,
      computeStep(aLen - 1, bLen - 1) + cost
    );
    computedDistances.get(aLen).set(bLen, distance);
    return distance;
  })(a4.length, b3.length);
}
function getAlternativesAsStringFor(functionName) {
  const alternativeFunctions = !registeredFunctionsByName[functionName] ? (
    // Get closest functions by levenstein distance
    Object.keys(registeredFunctionsByName).map((alternativeName) => {
      return {
        name: alternativeName,
        distance: computeLevenshteinDistance(
          functionName,
          alternativeName.slice(alternativeName.lastIndexOf(":") + 1)
        )
      };
    }).sort((a4, b3) => a4.distance - b3.distance).slice(0, 5).filter(
      (alternativeNameWithScore) => alternativeNameWithScore.distance < functionName.length / 2
    ).reduce(
      (alternatives, alternativeNameWithScore) => alternatives.concat(
        registeredFunctionsByName[alternativeNameWithScore.name]
      ),
      []
    ).slice(0, 5)
  ) : registeredFunctionsByName[functionName];
  if (!alternativeFunctions.length) {
    return "No similar functions found.";
  }
  return alternativeFunctions.map(
    (functionDeclaration) => `"Q{${functionDeclaration.namespaceURI}}${functionDeclaration.localName} (${functionDeclaration.argumentTypes.map(
      (argumentType) => argumentType === 4 /* ELLIPSIS */ ? "..." : sequenceTypeToString(argumentType)
    ).join(", ")})"`
  ).reduce((accumulator, alternativeFunctionName, index, array) => {
    if (index === 0) {
      return accumulator + alternativeFunctionName;
    }
    return accumulator += (index !== array.length - 1 ? ", " : " or ") + alternativeFunctionName;
  }, "Did you mean ") + "?";
}
function getFunctionByArity(functionNamespaceURI, functionLocalName, arity) {
  const matchingFunctions = registeredFunctionsByName[functionNamespaceURI + ":" + functionLocalName];
  if (!matchingFunctions) {
    return null;
  }
  const matchingFunction = matchingFunctions.find((functionDeclaration) => {
    const isElipsis = functionDeclaration.argumentTypes.some(
      (argument) => argument === 4 /* ELLIPSIS */
    );
    if (isElipsis) {
      return functionDeclaration.argumentTypes.length - 1 <= arity;
    }
    return functionDeclaration.argumentTypes.length === arity;
  });
  if (!matchingFunction) {
    return null;
  }
  return {
    argumentTypes: matchingFunction.argumentTypes,
    arity,
    callFunction: matchingFunction.callFunction,
    isUpdating: matchingFunction.isUpdating,
    localName: functionLocalName,
    namespaceURI: functionNamespaceURI,
    returnType: matchingFunction.returnType
  };
}
function registerFunction(namespaceURI, localName, argumentTypes, returnType, callFunction2) {
  if (!registeredFunctionsByName[namespaceURI + ":" + localName]) {
    registeredFunctionsByName[namespaceURI + ":" + localName] = [];
  }
  registeredFunctionsByName[namespaceURI + ":" + localName].push({
    argumentTypes,
    arity: argumentTypes.length,
    callFunction: callFunction2,
    isUpdating: false,
    localName,
    namespaceURI,
    returnType
  });
}

// ../gh/fontoxpath/src/expressions/ExecutionSpecificStaticContext.ts
var generateGlobalVariableBindingName = (variableName) => `Q{}${variableName}[0]`;
var ExecutionSpecificStaticContext = class {
  constructor(namespaceResolver, variableByName, defaultFunctionNamespaceURI, functionNameResolver) {
    this.registeredVariableBindingByHashKey = [/* @__PURE__ */ Object.create(null)];
    this.registeredVariableDeclarationByHashKey = /* @__PURE__ */ Object.create(null);
    this._namespaceResolver = namespaceResolver;
    this._variableBindingByName = Object.keys(variableByName).reduce(
      (bindings, variableName) => {
        if (variableByName[variableName] === void 0) {
          return bindings;
        }
        bindings[variableName] = generateGlobalVariableBindingName(variableName);
        return bindings;
      },
      /* @__PURE__ */ Object.create(null)
    );
    this._referredVariableByName = /* @__PURE__ */ Object.create(null);
    this._referredNamespaceByName = /* @__PURE__ */ Object.create(null);
    this.registeredDefaultFunctionNamespaceURI = defaultFunctionNamespaceURI;
    this._functionNameResolver = functionNameResolver;
    this._resolvedFunctions = [];
    this.executionContextWasRequired = false;
  }
  getReferredNamespaces() {
    return Object.values(this._referredNamespaceByName);
  }
  getReferredVariables() {
    return Object.values(this._referredVariableByName);
  }
  getResolvedFunctions() {
    return this._resolvedFunctions;
  }
  lookupFunction(namespaceURI, localName, arity, _skipExternal) {
    return getFunctionByArity(namespaceURI, localName, arity);
  }
  lookupVariable(namespaceURI, localName) {
    this.executionContextWasRequired = true;
    if (namespaceURI) {
      return null;
    }
    const bindingName = this._variableBindingByName[localName];
    if (!this._referredVariableByName[localName]) {
      this._referredVariableByName[localName] = {
        name: localName
      };
    }
    return bindingName;
  }
  resolveFunctionName(lexicalQName, arity) {
    const resolvedQName = this._functionNameResolver(lexicalQName, arity);
    if (resolvedQName) {
      this._resolvedFunctions.push({
        lexicalQName,
        arity,
        resolvedQName
      });
    } else if (lexicalQName.prefix === "") {
      if (this.registeredDefaultFunctionNamespaceURI) {
        return {
          namespaceURI: this.registeredDefaultFunctionNamespaceURI,
          localName: lexicalQName.localName
        };
      }
    } else {
      const namespaceURI = this.resolveNamespace(lexicalQName.prefix, true);
      if (namespaceURI) {
        return {
          namespaceURI,
          localName: lexicalQName.localName
        };
      }
    }
    return resolvedQName;
  }
  resolveNamespace(prefix2, useExternalResolver = true) {
    if (!useExternalResolver) {
      return null;
    }
    if (staticallyKnownNamespaceByPrefix[prefix2]) {
      return staticallyKnownNamespaceByPrefix[prefix2];
    }
    this.executionContextWasRequired = true;
    const uri = this._namespaceResolver(prefix2);
    if (!this._referredNamespaceByName[prefix2]) {
      this._referredNamespaceByName[prefix2] = {
        namespaceURI: uri,
        prefix: prefix2
      };
    }
    if (uri === void 0 && !prefix2) {
      return null;
    }
    return uri;
  }
};

// ../gh/fontoxpath/src/expressions/xquery/XQueryErrors.ts
var errXPTY00042 = (message) => new Error(`XPTY0004: ${message}`);
var errXQTY0024 = (node, domFacade2) => {
  const nodeString = domFacade2.getNodeType(node) === 2 /* ATTRIBUTE_NODE */ ? `${domFacade2.getNodeName(
    node
  )}="${domFacade2.getDataFromPointer(node)}"` : node.node.outerHTML;
  return new Error(
    `XQTY0024: The node ${nodeString} follows a node that is not an attribute node or a namespace node.`
  );
};
var errXQDY0025 = (attributeName) => new Error(
  `XQDY0025: The attribute ${attributeName} does not have an unique name in the constructed element.`
);
var errXQDY0026 = (content) => new Error(
  `XQDY0026: The content "${content}" for a processing instruction node contains "?>".`
);
var errXQST0040 = (attributeName) => new Error(
  `XQST0040: The attribute ${attributeName} does not have an unique name in the constructed element.`
);
var errXQDY0041 = (name2) => new Error(
  `XQDY0041: The value "${name2}" of a name expressions cannot be converted to a NCName.`
);
var errXQDY0044 = (qName2) => new Error(
  `XQDY0044: The node name "${qName2.buildPrefixedName()}" is invalid for a computed attribute constructor.`
);
var errXQST0045 = () => new Error(
  "XQST0045: Functions and variables may not be declared in one of the reserved namespace URIs."
);
var errXQST0047 = (namespaceURI) => new Error(`XQST0047: The namespace "${namespaceURI}" is imported more than once.`);
var errXQST0049 = (namespaceURI, localName) => new Error(
  `XQST0049: The function or variable "Q{${namespaceURI}}${localName}" is declared more than once.`
);
var errXQST0060 = () => new Error(
  "XQST0060: Functions declared in a module or as an external function must reside in a namespace."
);
var errXQST0066 = () => new Error("XQST0066: A Prolog may contain at most one default function namespace declaration.");
var errXQST0070 = () => new Error(
  "XQST0070: The prefixes xml and xmlns may not be used in a namespace declaration or be bound to another namespaceURI."
);
var errXQDY0072 = (content) => new Error(
  `XQDY0072: The content "${content}" for a comment node contains two adjacent hyphens or ends with a hyphen.`
);
var errXQDY0074 = (name2) => new Error(
  `XQDY0074: The value "${name2}" of a name expressions cannot be converted to an expanded QName.`
);
var errXPST00812 = (prefix2) => new Error(`XPST0081: The prefix "${prefix2}" could not be resolved`);
var errXQDY0096 = (qName2) => new Error(
  `XQDY0096: The node name "${qName2.buildPrefixedName()}" is invalid for a computed element constructor.`
);

// ../gh/fontoxpath/src/expressions/StaticContext.ts
function createHashKey(namespaceURI, localName) {
  return `Q{${namespaceURI || ""}}${localName}`;
}
function lookupInOverrides(overrides, key) {
  key = key + "";
  for (let i4 = overrides.length - 1; i4 >= 0; --i4) {
    if (key in overrides[i4]) {
      return overrides[i4][key];
    }
  }
  return void 0;
}
var StaticContext = class _StaticContext {
  constructor(parentContext) {
    this.parentContext = parentContext;
    this._scopeDepth = 0;
    this._scopeCount = 0;
    this._registeredNamespaceURIByPrefix = [/* @__PURE__ */ Object.create(null)];
    this._registeredFunctionsByHash = /* @__PURE__ */ Object.create(null);
    this.registeredDefaultFunctionNamespaceURI = null;
    this.registeredVariableDeclarationByHashKey = parentContext && parentContext.registeredVariableDeclarationByHashKey;
    this.registeredVariableBindingByHashKey = parentContext && parentContext.registeredVariableBindingByHashKey;
  }
  /**
   * Make a clone of this static context at the current scope that can be retained for later usage
   * (such as dynamic namespace lookups)
   */
  cloneContext() {
    const contextAtThisPoint = new _StaticContext(this.parentContext);
    for (let i4 = 0; i4 < this._scopeDepth + 1; ++i4) {
      contextAtThisPoint._registeredNamespaceURIByPrefix = [
        Object.assign(
          /* @__PURE__ */ Object.create(null),
          contextAtThisPoint._registeredNamespaceURIByPrefix[0],
          this._registeredNamespaceURIByPrefix[i4]
        )
      ];
      contextAtThisPoint.registeredVariableBindingByHashKey = [
        Object.assign(
          /* @__PURE__ */ Object.create(null),
          contextAtThisPoint.registeredVariableBindingByHashKey[0],
          this.registeredVariableBindingByHashKey[i4]
        )
      ];
      contextAtThisPoint._registeredFunctionsByHash = Object.assign(
        /* @__PURE__ */ Object.create(null),
        this._registeredFunctionsByHash
      );
      contextAtThisPoint.registeredVariableDeclarationByHashKey = this.registeredVariableDeclarationByHashKey;
      contextAtThisPoint.registeredDefaultFunctionNamespaceURI = this.registeredDefaultFunctionNamespaceURI;
    }
    return contextAtThisPoint;
  }
  getVariableBindings() {
    return Object.keys(this.registeredVariableDeclarationByHashKey);
  }
  getVariableDeclaration(hashKey) {
    return this.registeredVariableDeclarationByHashKey[hashKey];
  }
  introduceScope() {
    this._scopeCount++;
    this._scopeDepth++;
    this._registeredNamespaceURIByPrefix[this._scopeDepth] = /* @__PURE__ */ Object.create(null);
    this.registeredVariableBindingByHashKey[this._scopeDepth] = /* @__PURE__ */ Object.create(null);
  }
  lookupFunction(namespaceURI, localName, arity, skipExternal = false) {
    const hashKey = createHashKey(namespaceURI, localName) + "~" + arity;
    const foundFunction = this._registeredFunctionsByHash[hashKey];
    if (foundFunction) {
      if (!skipExternal || !foundFunction.isExternal) {
        return foundFunction;
      }
    }
    return this.parentContext === null ? null : this.parentContext.lookupFunction(namespaceURI, localName, arity, skipExternal);
  }
  lookupVariable(namespaceURI, localName) {
    const hash2 = createHashKey(namespaceURI, localName);
    const varNameInCurrentScope = lookupInOverrides(
      this.registeredVariableBindingByHashKey,
      hash2
    );
    if (varNameInCurrentScope) {
      return varNameInCurrentScope;
    }
    return this.parentContext === null ? null : this.parentContext.lookupVariable(namespaceURI, localName);
  }
  lookupVariableValue(namespaceURI, localName) {
    const hash2 = createHashKey(namespaceURI, localName);
    const varNameInCurrentScope = this.registeredVariableDeclarationByHashKey[hash2];
    if (varNameInCurrentScope) {
      return varNameInCurrentScope;
    }
    return null;
  }
  registerFunctionDefinition(namespaceURI, localName, arity, functionDefinition) {
    const hashKey = createHashKey(namespaceURI, localName) + "~" + arity;
    const duplicateFunction = this._registeredFunctionsByHash[hashKey];
    if (duplicateFunction) {
      throw errXQST0049(namespaceURI, localName);
    }
    this._registeredFunctionsByHash[hashKey] = functionDefinition;
  }
  registerNamespace(prefix2, namespaceURI) {
    this._registeredNamespaceURIByPrefix[this._scopeDepth][prefix2] = namespaceURI;
  }
  /**
   * Register the _existence_ of a variable.
   *
   * We need this to separate variable declaration (which is required to be done statically) and
   * from when the dynamic context of the variable will be known.
   */
  registerVariable(namespaceURI, localName) {
    const hash2 = createHashKey(namespaceURI || "", localName);
    return this.registeredVariableBindingByHashKey[this._scopeDepth][hash2] = `${hash2}[${this._scopeCount}]`;
  }
  registerVariableDeclaration(namespaceURI, localName, createValue) {
    const hash2 = `${createHashKey(namespaceURI || "", localName)}[${this._scopeCount}]`;
    this.registeredVariableDeclarationByHashKey[hash2] = createValue;
  }
  removeScope() {
    this._registeredNamespaceURIByPrefix.length = this._scopeDepth;
    this.registeredVariableBindingByHashKey.length = this._scopeDepth;
    this._scopeDepth--;
  }
  resolveFunctionName(lexicalQName, arity) {
    const { prefix: prefix2, localName } = lexicalQName;
    if (prefix2 === "" && this.registeredDefaultFunctionNamespaceURI) {
      return {
        localName,
        namespaceURI: this.registeredDefaultFunctionNamespaceURI
      };
    } else if (prefix2) {
      const namespaceURI = this.resolveNamespace(prefix2, false);
      if (namespaceURI) {
        return { localName, namespaceURI };
      }
    }
    return this.parentContext === null ? null : this.parentContext.resolveFunctionName(lexicalQName, arity);
  }
  resolveNamespace(prefix2, useExternalResolver = true) {
    const uri = lookupInOverrides(this._registeredNamespaceURIByPrefix, prefix2 || "");
    if (uri === void 0) {
      return this.parentContext === null ? void 0 : this.parentContext.resolveNamespace(prefix2 || "", useExternalResolver);
    }
    return uri;
  }
};

// ../gh/fontoxpath/src/parsing/astHelper.ts
function getChildren(ast, name2) {
  const children = [];
  for (let i4 = 1; i4 < ast.length; ++i4) {
    if (!Array.isArray(ast[i4])) {
      continue;
    }
    const astPart = ast[i4];
    if (name2 === "*" || astPart[0] === name2) {
      children.push(astPart);
    }
  }
  return children;
}
function getFirstChild(ast, name2) {
  if (name2 !== "*" && !Array.isArray(name2)) {
    name2 = [name2];
  }
  for (let i4 = 1; i4 < ast.length; ++i4) {
    if (!Array.isArray(ast[i4])) {
      continue;
    }
    const astPart = ast[i4];
    if (name2 === "*" || name2.includes(astPart[0])) {
      return astPart;
    }
  }
  return null;
}
function getTextContent(ast) {
  if (ast.length < 2) {
    return "";
  }
  if (typeof ast[1] === "object") {
    return ast[2] || "";
  }
  return ast[1] || "";
}
function getTypeDeclaration(ast) {
  const typeDeclarationAst = getFirstChild(ast, "typeDeclaration");
  if (!typeDeclarationAst || getFirstChild(typeDeclarationAst, "voidSequenceType")) {
    return { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ };
  }
  const determineType = (typeAst) => {
    switch (typeAst[0]) {
      case "documentTest":
        return 55 /* DOCUMENTNODE */;
      case "elementTest":
        return 54 /* ELEMENT */;
      case "attributeTest":
        return 47 /* ATTRIBUTE */;
      case "piTest":
        return 57 /* PROCESSINGINSTRUCTION */;
      case "commentTest":
        return 58 /* COMMENT */;
      case "textTest":
        return 56 /* TEXT */;
      case "anyKindTest":
        return 53 /* NODE */;
      case "anyItemType":
        return 59 /* ITEM */;
      case "anyFunctionTest":
      case "functionTest":
      case "typedFunctionTest":
        return 60 /* FUNCTION */;
      case "anyMapTest":
      case "typedMapTest":
        return 61 /* MAP */;
      case "anyArrayTest":
      case "typedArrayTest":
        return 62 /* ARRAY */;
      case "atomicType":
        return stringToValueType(
          [getAttribute(typeAst, "prefix"), getTextContent(typeAst)].join(":")
        );
      case "parenthesizedItemType":
        return determineType(getFirstChild(typeAst, "*"));
      case "schemaElementTest":
      case "schemaAttributeTest":
      case "namespaceNodeTest":
      default:
        throw new Error(
          `Type declaration "${getFirstChild(typeDeclarationAst, "*")[0]}" is not supported.`
        );
    }
  };
  const type = {
    type: determineType(getFirstChild(typeDeclarationAst, "*")),
    mult: 3 /* EXACTLY_ONE */
  };
  let occurrence = null;
  const occurrenceNode = getFirstChild(typeDeclarationAst, "occurrenceIndicator");
  if (occurrenceNode) {
    occurrence = getTextContent(occurrenceNode);
  }
  switch (occurrence) {
    case "*":
      type.mult = 2 /* ZERO_OR_MORE */;
      return type;
    case "?":
      type.mult = 0 /* ZERO_OR_ONE */;
      return type;
    case "+":
      type.mult = 1 /* ONE_OR_MORE */;
      return type;
    case "":
    case null:
      return type;
  }
}
function followPath(ast, path) {
  return path.reduce(getFirstChild, ast);
}
function getAttribute(ast, attributeName) {
  if (!Array.isArray(ast)) {
    return null;
  }
  const maybeAttrs = ast[1];
  if (typeof maybeAttrs !== "object" || Array.isArray(maybeAttrs)) {
    return null;
  }
  const attrs = maybeAttrs;
  return attributeName in attrs ? attrs[attributeName] : null;
}
function getQName(ast) {
  return {
    localName: getTextContent(ast),
    namespaceURI: getAttribute(ast, "URI"),
    prefix: getAttribute(ast, "prefix")
  };
}
function insertAttribute(ast, name2, data) {
  if (typeof ast[1] === "object" && !Array.isArray(ast[1])) {
    ast[1][name2] = data;
  } else {
    const obj = {};
    obj[name2] = data;
    ast.splice(1, 0, obj);
  }
}
var astHelper_default = {
  followPath,
  getAttribute,
  getChildren,
  getFirstChild,
  getQName,
  getTextContent,
  getTypeDeclaration,
  insertAttribute
};

// ../gh/fontoxpath/src/typeInference/annotateArrayConstructor.ts
function annotateArrayConstructor(ast) {
  const seqType = {
    type: 62 /* ARRAY */,
    mult: 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateArrowExpr.ts
function annotateArrowExpr(ast, annotationContext) {
  if (!annotationContext || !annotationContext.staticContext) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  const func = astHelper_default.getFirstChild(ast, "EQName");
  if (!func) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  const qName2 = astHelper_default.getQName(func);
  const localName = qName2.localName;
  const prefix2 = qName2.prefix;
  const functionArguments = astHelper_default.getChildren(astHelper_default.getFirstChild(ast, "arguments"), "*");
  const resolvedName = annotationContext.staticContext.resolveFunctionName(
    {
      localName,
      prefix: prefix2
    },
    functionArguments.length
  );
  if (!resolvedName) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  const functionProps = annotationContext.staticContext.lookupFunction(
    resolvedName.namespaceURI,
    resolvedName.localName,
    // Since this is an arrowExpr, we add one for the implicit argument
    functionArguments.length + 1
  );
  if (!functionProps) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  if (functionProps.returnType.type !== 59 /* ITEM */) {
    astHelper_default.insertAttribute(ast, "type", functionProps.returnType);
  }
  return functionProps.returnType;
}

// ../gh/fontoxpath/src/expressions/operators/arithmetic/BinaryEvaluationFunctionMap.ts
var SHIFT_FIRST_ARGUMENT_OF_HASH_BY = 20;
var SHIFT_SECOND_ARGUMENT_OF_HASH_BY = 12;
var SHIFT_THIRD_ARGUMENT_OF_HASH_BY = 8;
function hash(left, right, op) {
  return (left << SHIFT_FIRST_ARGUMENT_OF_HASH_BY) + (right << SHIFT_SECOND_ARGUMENT_OF_HASH_BY) + (op.charCodeAt(0) << SHIFT_THIRD_ARGUMENT_OF_HASH_BY) + op.charCodeAt(1);
}
var returnTypeMap = {
  [hash(2 /* XSNUMERIC */, 2 /* XSNUMERIC */, "idivOp")]: 5 /* XSINTEGER */,
  [hash(16 /* XSYEARMONTHDURATION */, 16 /* XSYEARMONTHDURATION */, "addOp")]: 16 /* XSYEARMONTHDURATION */,
  [hash(16 /* XSYEARMONTHDURATION */, 16 /* XSYEARMONTHDURATION */, "subtractOp")]: 16 /* XSYEARMONTHDURATION */,
  [hash(16 /* XSYEARMONTHDURATION */, 16 /* XSYEARMONTHDURATION */, "divOp")]: 4 /* XSDECIMAL */,
  [hash(16 /* XSYEARMONTHDURATION */, 2 /* XSNUMERIC */, "multiplyOp")]: 16 /* XSYEARMONTHDURATION */,
  [hash(16 /* XSYEARMONTHDURATION */, 2 /* XSNUMERIC */, "divOp")]: 16 /* XSYEARMONTHDURATION */,
  [hash(2 /* XSNUMERIC */, 16 /* XSYEARMONTHDURATION */, "multiplyOp")]: 16 /* XSYEARMONTHDURATION */,
  [hash(17 /* XSDAYTIMEDURATION */, 17 /* XSDAYTIMEDURATION */, "addOp")]: 17 /* XSDAYTIMEDURATION */,
  [hash(17 /* XSDAYTIMEDURATION */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: 17 /* XSDAYTIMEDURATION */,
  [hash(17 /* XSDAYTIMEDURATION */, 17 /* XSDAYTIMEDURATION */, "divOp")]: 4 /* XSDECIMAL */,
  [hash(17 /* XSDAYTIMEDURATION */, 2 /* XSNUMERIC */, "multiplyOp")]: 17 /* XSDAYTIMEDURATION */,
  [hash(17 /* XSDAYTIMEDURATION */, 2 /* XSNUMERIC */, "divOp")]: 17 /* XSDAYTIMEDURATION */,
  [hash(2 /* XSNUMERIC */, 17 /* XSDAYTIMEDURATION */, "multiplyOp")]: 17 /* XSDAYTIMEDURATION */,
  [hash(9 /* XSDATETIME */, 9 /* XSDATETIME */, "subtractOp")]: 17 /* XSDAYTIMEDURATION */,
  [hash(7 /* XSDATE */, 7 /* XSDATE */, "subtractOp")]: 17 /* XSDAYTIMEDURATION */,
  [hash(8 /* XSTIME */, 8 /* XSTIME */, "subtractOp")]: 17 /* XSDAYTIMEDURATION */,
  [hash(9 /* XSDATETIME */, 16 /* XSYEARMONTHDURATION */, "addOp")]: 9 /* XSDATETIME */,
  [hash(9 /* XSDATETIME */, 16 /* XSYEARMONTHDURATION */, "subtractOp")]: 9 /* XSDATETIME */,
  [hash(9 /* XSDATETIME */, 17 /* XSDAYTIMEDURATION */, "addOp")]: 9 /* XSDATETIME */,
  [hash(9 /* XSDATETIME */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: 9 /* XSDATETIME */,
  [hash(7 /* XSDATE */, 16 /* XSYEARMONTHDURATION */, "addOp")]: 7 /* XSDATE */,
  [hash(7 /* XSDATE */, 16 /* XSYEARMONTHDURATION */, "subtractOp")]: 7 /* XSDATE */,
  [hash(7 /* XSDATE */, 17 /* XSDAYTIMEDURATION */, "addOp")]: 7 /* XSDATE */,
  [hash(7 /* XSDATE */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: 7 /* XSDATE */,
  [hash(8 /* XSTIME */, 17 /* XSDAYTIMEDURATION */, "addOp")]: 8 /* XSTIME */,
  [hash(8 /* XSTIME */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: 8 /* XSTIME */,
  [hash(9 /* XSDATETIME */, 16 /* XSYEARMONTHDURATION */, "addOp")]: 9 /* XSDATETIME */,
  [hash(9 /* XSDATETIME */, 16 /* XSYEARMONTHDURATION */, "subtractOp")]: 9 /* XSDATETIME */,
  [hash(9 /* XSDATETIME */, 17 /* XSDAYTIMEDURATION */, "addOp")]: 9 /* XSDATETIME */,
  [hash(9 /* XSDATETIME */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: 9 /* XSDATETIME */,
  [hash(7 /* XSDATE */, 17 /* XSDAYTIMEDURATION */, "addOp")]: 7 /* XSDATE */,
  [hash(7 /* XSDATE */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: 7 /* XSDATE */,
  [hash(7 /* XSDATE */, 16 /* XSYEARMONTHDURATION */, "addOp")]: 7 /* XSDATE */,
  [hash(7 /* XSDATE */, 16 /* XSYEARMONTHDURATION */, "subtractOp")]: 7 /* XSDATE */,
  [hash(8 /* XSTIME */, 17 /* XSDAYTIMEDURATION */, "addOp")]: 8 /* XSTIME */,
  [hash(8 /* XSTIME */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: 8 /* XSTIME */
};
var operationMap = {
  [hash(2 /* XSNUMERIC */, 2 /* XSNUMERIC */, "addOp")]: (a4, b3) => a4 + b3,
  [hash(2 /* XSNUMERIC */, 2 /* XSNUMERIC */, "subtractOp")]: (a4, b3) => a4 - b3,
  [hash(2 /* XSNUMERIC */, 2 /* XSNUMERIC */, "multiplyOp")]: (a4, b3) => a4 * b3,
  [hash(2 /* XSNUMERIC */, 2 /* XSNUMERIC */, "divOp")]: (a4, b3) => a4 / b3,
  [hash(2 /* XSNUMERIC */, 2 /* XSNUMERIC */, "modOp")]: (a4, b3) => a4 % b3,
  [hash(2 /* XSNUMERIC */, 2 /* XSNUMERIC */, "idivOp")]: (a4, b3) => Math.trunc(a4 / b3),
  [hash(16 /* XSYEARMONTHDURATION */, 16 /* XSYEARMONTHDURATION */, "addOp")]: add2,
  [hash(16 /* XSYEARMONTHDURATION */, 16 /* XSYEARMONTHDURATION */, "subtractOp")]: subtract3,
  [hash(16 /* XSYEARMONTHDURATION */, 16 /* XSYEARMONTHDURATION */, "divOp")]: divideByYearMonthDuration,
  [hash(16 /* XSYEARMONTHDURATION */, 2 /* XSNUMERIC */, "multiplyOp")]: multiply2,
  [hash(16 /* XSYEARMONTHDURATION */, 2 /* XSNUMERIC */, "divOp")]: divide2,
  [hash(2 /* XSNUMERIC */, 16 /* XSYEARMONTHDURATION */, "multiplyOp")]: (a4, b3) => multiply2(b3, a4),
  [hash(17 /* XSDAYTIMEDURATION */, 17 /* XSDAYTIMEDURATION */, "addOp")]: add,
  [hash(17 /* XSDAYTIMEDURATION */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: subtract,
  [hash(17 /* XSDAYTIMEDURATION */, 17 /* XSDAYTIMEDURATION */, "divOp")]: divideByDayTimeDuration,
  [hash(17 /* XSDAYTIMEDURATION */, 2 /* XSNUMERIC */, "multiplyOp")]: multiply,
  [hash(17 /* XSDAYTIMEDURATION */, 2 /* XSNUMERIC */, "divOp")]: divide,
  [hash(2 /* XSNUMERIC */, 17 /* XSDAYTIMEDURATION */, "multiplyOp")]: (a4, b3) => multiply(b3, a4),
  [hash(9 /* XSDATETIME */, 9 /* XSDATETIME */, "subtractOp")]: subtract2,
  [hash(7 /* XSDATE */, 7 /* XSDATE */, "subtractOp")]: subtract2,
  [hash(8 /* XSTIME */, 8 /* XSTIME */, "subtractOp")]: subtract2,
  [hash(9 /* XSDATETIME */, 16 /* XSYEARMONTHDURATION */, "addOp")]: addDuration,
  [hash(9 /* XSDATETIME */, 16 /* XSYEARMONTHDURATION */, "subtractOp")]: subtractDuration,
  [hash(9 /* XSDATETIME */, 17 /* XSDAYTIMEDURATION */, "addOp")]: addDuration,
  [hash(9 /* XSDATETIME */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: subtractDuration,
  [hash(7 /* XSDATE */, 16 /* XSYEARMONTHDURATION */, "addOp")]: addDuration,
  [hash(7 /* XSDATE */, 16 /* XSYEARMONTHDURATION */, "subtractOp")]: subtractDuration,
  [hash(7 /* XSDATE */, 17 /* XSDAYTIMEDURATION */, "addOp")]: addDuration,
  [hash(7 /* XSDATE */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: subtractDuration,
  [hash(8 /* XSTIME */, 17 /* XSDAYTIMEDURATION */, "addOp")]: addDuration,
  [hash(8 /* XSTIME */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: subtractDuration,
  [hash(9 /* XSDATETIME */, 16 /* XSYEARMONTHDURATION */, "addOp")]: addDuration,
  [hash(9 /* XSDATETIME */, 16 /* XSYEARMONTHDURATION */, "subtractOp")]: subtractDuration,
  [hash(9 /* XSDATETIME */, 17 /* XSDAYTIMEDURATION */, "addOp")]: addDuration,
  [hash(9 /* XSDATETIME */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: subtractDuration,
  [hash(7 /* XSDATE */, 17 /* XSDAYTIMEDURATION */, "addOp")]: addDuration,
  [hash(7 /* XSDATE */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: subtractDuration,
  [hash(7 /* XSDATE */, 16 /* XSYEARMONTHDURATION */, "addOp")]: addDuration,
  [hash(7 /* XSDATE */, 16 /* XSYEARMONTHDURATION */, "subtractOp")]: subtractDuration,
  [hash(8 /* XSTIME */, 17 /* XSDAYTIMEDURATION */, "addOp")]: addDuration,
  [hash(8 /* XSTIME */, 17 /* XSDAYTIMEDURATION */, "subtractOp")]: subtractDuration
};

// ../gh/fontoxpath/src/expressions/operators/arithmetic/BinaryOperator.ts
function determineReturnType(typeA, typeB) {
  if (isSubtypeOf(typeA, 5 /* XSINTEGER */) && isSubtypeOf(typeB, 5 /* XSINTEGER */)) {
    return 5 /* XSINTEGER */;
  }
  if (isSubtypeOf(typeA, 4 /* XSDECIMAL */) && isSubtypeOf(typeB, 4 /* XSDECIMAL */)) {
    return 4 /* XSDECIMAL */;
  }
  if (isSubtypeOf(typeA, 6 /* XSFLOAT */) && isSubtypeOf(typeB, 6 /* XSFLOAT */)) {
    return 6 /* XSFLOAT */;
  }
  return 3 /* XSDOUBLE */;
}
var allTypes = [
  2 /* XSNUMERIC */,
  16 /* XSYEARMONTHDURATION */,
  17 /* XSDAYTIMEDURATION */,
  9 /* XSDATETIME */,
  7 /* XSDATE */,
  8 /* XSTIME */
];
function generateBinaryOperatorFunction(operator, typeA, typeB) {
  let castFunctionForValueA = null;
  let castFunctionForValueB = null;
  if (isSubtypeOf(typeA, 19 /* XSUNTYPEDATOMIC */)) {
    castFunctionForValueA = (value) => castToType(value, 3 /* XSDOUBLE */);
    typeA = 3 /* XSDOUBLE */;
  }
  if (isSubtypeOf(typeB, 19 /* XSUNTYPEDATOMIC */)) {
    castFunctionForValueB = (value) => castToType(value, 3 /* XSDOUBLE */);
    typeB = 3 /* XSDOUBLE */;
  }
  const parentTypesOfA = allTypes.filter((e4) => isSubtypeOf(typeA, e4));
  const parentTypesOfB = allTypes.filter((e4) => isSubtypeOf(typeB, e4));
  function applyCastFunctions(valueA, valueB) {
    return {
      castA: castFunctionForValueA ? castFunctionForValueA(valueA) : valueA,
      castB: castFunctionForValueB ? castFunctionForValueB(valueB) : valueB
    };
  }
  if (parentTypesOfA.includes(2 /* XSNUMERIC */) && parentTypesOfB.includes(2 /* XSNUMERIC */)) {
    const fun = operationMap[hash(2 /* XSNUMERIC */, 2 /* XSNUMERIC */, operator)];
    let retType = returnTypeMap[hash(2 /* XSNUMERIC */, 2 /* XSNUMERIC */, operator)];
    if (!retType) retType = determineReturnType(typeA, typeB);
    if (operator === "divOp" && retType === 5 /* XSINTEGER */) retType = 4 /* XSDECIMAL */;
    if (operator === "idivOp") return iDivOpChecksFunction(applyCastFunctions, fun)[0];
    const isDecimalResult = retType === 4 /* XSDECIMAL */;
    return (a4, b3) => {
      const { castA, castB } = applyCastFunctions(a4, b3);
      const raw = fun(castA.value, castB.value);
      if (!isDecimalResult) return createAtomicValue(raw, retType);
      const inexact = castA.inexact === true || castB.inexact === true;
      const result = createAtomicValue(
        inexact ? raw : cleanDecimalResult(operator, castA.value, castB.value, raw),
        retType
      );
      if (inexact || operator === "divOp") {
        if (!Number.isInteger(result.value)) result.inexact = inexact;
      }
      return result;
    };
  }
  for (const typeOfA of parentTypesOfA) {
    for (const typeOfB of parentTypesOfB) {
      const func = operationMap[hash(typeOfA, typeOfB, operator)];
      const ret = returnTypeMap[hash(typeOfA, typeOfB, operator)];
      if (func && ret !== void 0) {
        return (a4, b3) => {
          const { castA, castB } = applyCastFunctions(a4, b3);
          return createAtomicValue(func(castA.value, castB.value), ret);
        };
      }
    }
  }
  return void 0;
}
function generateBinaryOperatorType(operator, typeA, typeB) {
  const GENERIC_NUMERIC_VALUE_TYPES = [
    2 /* XSNUMERIC */,
    53 /* NODE */,
    59 /* ITEM */,
    46 /* XSANYATOMICTYPE */,
    47 /* ATTRIBUTE */
  ];
  if (GENERIC_NUMERIC_VALUE_TYPES.includes(typeA) || GENERIC_NUMERIC_VALUE_TYPES.includes(typeB)) {
    return 2 /* XSNUMERIC */;
  }
  let castFunctionForValueA = null;
  let castFunctionForValueB = null;
  if (isSubtypeOf(typeA, 19 /* XSUNTYPEDATOMIC */)) {
    castFunctionForValueA = (value) => castToType(value, 3 /* XSDOUBLE */);
    typeA = 3 /* XSDOUBLE */;
  }
  if (isSubtypeOf(typeB, 19 /* XSUNTYPEDATOMIC */)) {
    castFunctionForValueB = (value) => castToType(value, 3 /* XSDOUBLE */);
    typeB = 3 /* XSDOUBLE */;
  }
  function applyCastFunctions(valueA, valueB) {
    return {
      castA: castFunctionForValueA ? castFunctionForValueA(valueA) : valueA,
      castB: castFunctionForValueB ? castFunctionForValueB(valueB) : valueB
    };
  }
  const parentTypesOfA = allTypes.filter((e4) => isSubtypeOf(typeA, e4));
  const parentTypesOfB = allTypes.filter((e4) => isSubtypeOf(typeB, e4));
  if (parentTypesOfA.includes(2 /* XSNUMERIC */) && parentTypesOfB.includes(2 /* XSNUMERIC */)) {
    let retType = returnTypeMap[hash(2 /* XSNUMERIC */, 2 /* XSNUMERIC */, operator)];
    if (retType === void 0) retType = determineReturnType(typeA, typeB);
    if (operator === "divOp" && retType === 5 /* XSINTEGER */) retType = 4 /* XSDECIMAL */;
    if (operator === "idivOp")
      return iDivOpChecksFunction(applyCastFunctions, (a4, b3) => Math.trunc(a4 / b3))[1];
    return retType;
  }
  for (const typeOfA of parentTypesOfA) {
    for (const typeOfB of parentTypesOfB) {
      const ret = returnTypeMap[hash(typeOfA, typeOfB, operator)];
      if (ret !== void 0) {
        return ret;
      }
    }
  }
  return void 0;
}
function iDivOpChecksFunction(applyCastFunctions, fun) {
  return [
    (a4, b3) => {
      const { castA, castB } = applyCastFunctions(a4, b3);
      if (castB.value === 0) {
        throw new Error("FOAR0001: Divisor of idiv operator cannot be (-)0");
      }
      if (Number.isNaN(castA.value) || Number.isNaN(castB.value) || !Number.isFinite(castA.value)) {
        throw new Error(
          "FOAR0002: One of the operands of idiv is NaN or the first operand is (-)INF"
        );
      }
      if (Number.isFinite(castA.value) && !Number.isFinite(castB.value)) {
        return createAtomicValue(0, 5 /* XSINTEGER */);
      }
      return createAtomicValue(fun(castA.value, castB.value), 5 /* XSINTEGER */);
    },
    5 /* XSINTEGER */
  ];
}
var operatorsByTypingKey = /* @__PURE__ */ Object.create(null);
function getBinaryPrefabOperator(leftType, rightType, operator) {
  const typingKey = `${leftType}~${rightType}~${operator}`;
  let prefabOperator = operatorsByTypingKey[typingKey];
  if (!prefabOperator) {
    prefabOperator = operatorsByTypingKey[typingKey] = generateBinaryOperatorFunction(
      operator,
      leftType,
      rightType
    );
  }
  return prefabOperator;
}
var BinaryOperator = class extends Expression_default {
  /**
   * @param  operator         One of addOp, substractOp, multiplyOp, divOp, idivOp, modOp
   * @param  firstValueExpr   The selector evaluating to the first value to process
   * @param  secondValueExpr  The selector evaluating to the second value to process
   */
  constructor(operator, firstValueExpr, secondValueExpr, type, evaluateFunction) {
    super(
      firstValueExpr.specificity.add(secondValueExpr.specificity),
      [firstValueExpr, secondValueExpr],
      {
        canBeStaticallyEvaluated: false
      },
      false,
      type
    );
    this._firstValueExpr = firstValueExpr;
    this._secondValueExpr = secondValueExpr;
    this._operator = operator;
    this._evaluateFunction = evaluateFunction;
  }
  /**
   * A method to evaluate the BinaryOperation.
   *
   * @param dynamicContext The context in which it will be evaluated
   * @param executionParameters options
   * @returns The value to which the operation evaluates.
   */
  evaluate(dynamicContext, executionParameters) {
    const firstValueSequence = atomize(
      this._firstValueExpr.evaluateMaybeStatically(dynamicContext, executionParameters),
      executionParameters
    );
    return firstValueSequence.mapAll((firstValues) => {
      if (firstValues.length === 0) {
        return sequenceFactory_default.empty();
      }
      const secondValueSequence = atomize(
        this._secondValueExpr.evaluateMaybeStatically(dynamicContext, executionParameters),
        executionParameters
      );
      return secondValueSequence.mapAll((secondValues) => {
        if (secondValues.length === 0) {
          return sequenceFactory_default.empty();
        }
        if (firstValues.length > 1 || secondValues.length > 1) {
          throw new Error(
            'XPTY0004: the operands of the "' + this._operator + '" operator should be empty or singleton.'
          );
        }
        const firstValue = firstValues[0];
        const secondValue = secondValues[0];
        if (this._evaluateFunction && this.type) {
          return sequenceFactory_default.singleton(
            this._evaluateFunction(firstValue, secondValue)
          );
        }
        const prefabOperator = getBinaryPrefabOperator(
          firstValue.type,
          secondValue.type,
          this._operator
        );
        if (!prefabOperator) {
          throw new Error(
            `XPTY0004: ${this._operator} not available for types ${valueTypeToString(
              firstValue.type
            )} and ${valueTypeToString(secondValue.type)}`
          );
        }
        return sequenceFactory_default.singleton(prefabOperator(firstValue, secondValue));
      });
    });
  }
};
var BinaryOperator_default = BinaryOperator;

// ../gh/fontoxpath/src/typeInference/annotateBinaryOperator.ts
function annotateBinOp(ast, left, right, operator, context) {
  if (!left || !right) {
    return {
      type: 2 /* XSNUMERIC */,
      mult: 3 /* EXACTLY_ONE */
    };
  }
  const valueType = generateBinaryOperatorType(operator, left.type, right.type);
  if (valueType) {
    const type = { type: valueType, mult: left.mult };
    if (valueType !== 2 /* XSNUMERIC */ && valueType !== 59 /* ITEM */) {
      astHelper_default.insertAttribute(ast, "type", type);
    }
    return type;
  }
  throw new Error(
    `XPTY0004: ${operator} not available for types ${sequenceTypeToString(
      left
    )} and ${sequenceTypeToString(right)}`
  );
}

// ../gh/fontoxpath/src/typeInference/annotateCastOperators.ts
function annotateCastOperator(ast) {
  const targetTypeString = getTargetTypeFromAST(ast);
  const targetValueType = stringToValueType(targetTypeString);
  const sequenceType = { type: targetValueType, mult: 3 /* EXACTLY_ONE */ };
  if (sequenceType.type !== 59 /* ITEM */) {
    astHelper_default.insertAttribute(ast, "type", sequenceType);
  }
  return sequenceType;
}
function annotateCastableOperator(ast) {
  const sequenceType = { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ };
  astHelper_default.insertAttribute(ast, "type", sequenceType);
  return sequenceType;
}
function getTargetTypeFromAST(ast) {
  const typeInfoNode = astHelper_default.followPath(ast, ["singleType", "atomicType"]);
  const prefix2 = astHelper_default.getAttribute(typeInfoNode, "prefix");
  const targetType = typeInfoNode[2];
  return prefix2 + ":" + targetType;
}

// ../gh/fontoxpath/src/typeInference/annotateCompareOperator.ts
function annotateGeneralCompare(ast) {
  const seqType = {
    type: 0 /* XSBOOLEAN */,
    mult: 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}
function annotateValueCompare(ast) {
  const firstOperandType = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, ["firstOperand", "*"]),
    "type"
  );
  const secondOperandType = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, ["secondOperand", "*"]),
    "type"
  );
  const seqType = {
    type: 0 /* XSBOOLEAN */,
    mult: doesTypeAllowEmpty(firstOperandType) || doesTypeAllowEmpty(secondOperandType) ? 0 /* ZERO_OR_ONE */ : 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}
function annotateNodeCompare(ast) {
  const firstOperandType = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, ["firstOperand", "*"]),
    "type"
  );
  const secondOperandType = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, ["secondOperand", "*"]),
    "type"
  );
  const seqType = {
    type: 0 /* XSBOOLEAN */,
    mult: doesTypeAllowEmpty(firstOperandType) || doesTypeAllowEmpty(secondOperandType) ? 0 /* ZERO_OR_ONE */ : 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateContextItemExpr.ts
function annotateContextItemExpr(ast) {
  return {
    type: 59 /* ITEM */,
    mult: 2 /* ZERO_OR_MORE */
  };
}

// ../gh/fontoxpath/src/typeInference/annotateDynamicFunctionInvocationExpr.ts
function annotateDynamicFunctionInvocationExpr(ast) {
  return {
    type: 59 /* ITEM */,
    mult: 2 /* ZERO_OR_MORE */
  };
}

// ../gh/fontoxpath/src/typeInference/annotateFlworExpression.ts
function annotateFlworExpression(ast, annotationContext, annotate2) {
  let hasFor = false;
  for (let i4 = 1; i4 < ast.length; i4++) {
    switch (ast[i4][0]) {
      case "letClause": {
        annotationContext.pushScope();
        annotateLetClause(ast[i4], annotationContext, annotate2);
        break;
      }
      case "forClause": {
        hasFor = true;
        annotationContext.pushScope();
        annotateForClause(ast[i4], annotationContext, annotate2);
        break;
      }
      case "whereClause": {
        annotationContext.pushScope();
        annotateWhereClause(ast[i4], annotationContext, annotate2);
        break;
      }
      case "orderByClause": {
        annotationContext.pushScope();
        annotateOrderByClause(ast[i4], annotationContext);
        break;
      }
      case "returnClause": {
        let retType = annotateReturnType(
          ast[i4],
          annotationContext,
          annotate2
        );
        if (!retType) {
          return { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ };
        }
        if (hasFor) {
          retType = { type: retType.type, mult: 2 /* ZERO_OR_MORE */ };
        }
        if (retType.type !== 59 /* ITEM */) {
          astHelper_default.insertAttribute(ast, "type", retType);
        }
        return retType;
      }
      default: {
        let retType = annotate2(ast[i4], annotationContext);
        if (!retType) {
          return { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ };
        }
        if (hasFor) {
          retType = { type: retType.type, mult: 2 /* ZERO_OR_MORE */ };
        }
        if (retType.type !== 59 /* ITEM */) {
          astHelper_default.insertAttribute(ast, "type", retType);
        }
        return retType;
      }
    }
  }
  annotationContext.popScope();
  return void 0;
}
function annotateLetClause(ast, annotationContext, annotate2) {
  const pathToVarName = ["letClauseItem", "typedVariableBinding", "varName"];
  const varNameNode = astHelper_default.followPath(ast, pathToVarName);
  const varName2 = astHelper_default.getQName(varNameNode);
  const pathToVarType = ["letClauseItem", "letExpr"];
  const varTypeNode = astHelper_default.followPath(ast, pathToVarType);
  const varType = annotate2(varTypeNode[1], annotationContext);
  annotationContext.insertVariable(varName2.localName, varType);
}
function annotateForClause(ast, annotationContext, annotate2) {
  const pathToTypedVariableBinding = ["forClauseItem", "typedVariableBinding", "varName"];
  const pathToForExpr = ["forClauseItem", "forExpr", "sequenceExpr"];
  const varName2 = astHelper_default.getQName(astHelper_default.followPath(ast, pathToTypedVariableBinding));
  const varTypeNode = astHelper_default.followPath(ast, pathToForExpr);
  if (!varTypeNode) {
    return;
  }
  const allTypes2 = astHelper_default.getChildren(varTypeNode, "*").map((element) => annotate2(element, annotationContext));
  if (allTypes2.includes(void 0) || allTypes2.includes(null)) {
    return;
  }
  const types = filterOnUniqueObjects(allTypes2);
  if (types.length === 1) {
    annotationContext.insertVariable(varName2.localName, types[0]);
  }
}
function annotateWhereClause(ast, annotationContext, annotate2) {
  const seqType = {
    type: 0 /* XSBOOLEAN */,
    mult: 3 /* EXACTLY_ONE */
  };
  annotate2(ast, annotationContext);
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}
function annotateOrderByClause(ast, annotationContext) {
  return void 0;
}
function filterOnUniqueObjects(array) {
  return array.filter(
    (current, index, arrayCopy) => arrayCopy.findIndex(
      (element) => element.type === current.type && element.mult === current.mult
    ) === index
  );
}
function annotateReturnType(ast, context, annotate2) {
  const pathFollowed = astHelper_default.followPath(ast, ["*"]);
  const returnType = annotate2(pathFollowed, context);
  astHelper_default.insertAttribute(pathFollowed, "type", returnType);
  astHelper_default.insertAttribute(ast, "type", returnType);
  return returnType;
}

// ../gh/fontoxpath/src/typeInference/annotateFunctionCall.ts
function annotateFunctionCall(ast, annotationContext) {
  if (!annotationContext || !annotationContext.staticContext) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  const functionNameAstNode = astHelper_default.getFirstChild(ast, "functionName");
  const qName2 = astHelper_default.getQName(functionNameAstNode);
  let localName = qName2.localName;
  const prefix2 = qName2.prefix;
  let namespaceURI = qName2.namespaceURI;
  const functionArguments = astHelper_default.getChildren(astHelper_default.getFirstChild(ast, "arguments"), "*");
  if (namespaceURI === null) {
    const resolvedName = annotationContext.staticContext.resolveFunctionName(
      {
        localName,
        prefix: prefix2
      },
      functionArguments.length
    );
    if (!resolvedName) {
      return {
        type: 59 /* ITEM */,
        mult: 2 /* ZERO_OR_MORE */
      };
    }
    localName = resolvedName.localName;
    namespaceURI = resolvedName.namespaceURI;
    astHelper_default.insertAttribute(functionNameAstNode, "URI", namespaceURI);
    functionNameAstNode[2] = localName;
  }
  const functionProps = annotationContext.staticContext.lookupFunction(
    namespaceURI,
    localName,
    functionArguments.length
  );
  if (!functionProps) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  if (functionProps.returnType.type === 63 /* NONE */) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  if (functionProps.returnType.type !== 59 /* ITEM */) {
    astHelper_default.insertAttribute(ast, "type", functionProps.returnType);
  }
  return functionProps.returnType;
}

// ../gh/fontoxpath/src/typeInference/annotateIfThenElseExpr.ts
function annotateIfThenElseExpr(ast, elseClause, thenClause) {
  if (!elseClause || !thenClause) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  if (elseClause.type === thenClause.type && elseClause.mult === thenClause.mult) {
    if (elseClause.type !== 59 /* ITEM */) {
      astHelper_default.insertAttribute(ast, "type", elseClause);
    }
    return elseClause;
  }
  return {
    type: 59 /* ITEM */,
    mult: 2 /* ZERO_OR_MORE */
  };
}

// ../gh/fontoxpath/src/typeInference/annotateInstanceOfExpr.ts
function annotateInstanceOfExpr(ast) {
  const seqType = {
    type: 0 /* XSBOOLEAN */,
    mult: 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateLogicalOperator.ts
function annotateLogicalOperator(ast) {
  switch (ast[0]) {
    case "orOp":
      return annotateOrOperator(ast);
    case "andOp":
      return annotateAndOperator(ast);
  }
}
function annotateOrOperator(ast) {
  const seqType = {
    type: 0 /* XSBOOLEAN */,
    mult: 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}
function annotateAndOperator(ast) {
  const seqType = {
    type: 0 /* XSBOOLEAN */,
    mult: 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateMapConstructor.ts
function annotateMapConstructor(ast) {
  const seqType = {
    type: 61 /* MAP */,
    mult: 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateNamedFunctionRef.ts
function annotateNamedFunctionRef(ast, annotationContext) {
  if (!annotationContext || !annotationContext.staticContext) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  const functionNameAstNode = astHelper_default.getFirstChild(ast, "functionName");
  const qName2 = astHelper_default.getQName(functionNameAstNode);
  let localName = qName2.localName;
  let namespaceURI = qName2.namespaceURI;
  const prefix2 = qName2.prefix;
  const arity = Number(
    astHelper_default.followPath(ast, ["integerConstantExpr", "value"])[1]
  );
  if (!namespaceURI) {
    const functionName = annotationContext.staticContext.resolveFunctionName(
      { localName, prefix: prefix2 },
      arity
    );
    if (!functionName) {
      return {
        type: 59 /* ITEM */,
        mult: 2 /* ZERO_OR_MORE */
      };
    }
    localName = functionName.localName;
    namespaceURI = functionName.namespaceURI;
    astHelper_default.insertAttribute(functionNameAstNode, "URI", namespaceURI);
  }
  const functionProperties = annotationContext.staticContext.lookupFunction(namespaceURI, localName, arity) || null;
  if (!functionProperties) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  if (functionProperties.returnType.type !== 59 /* ITEM */ && functionProperties.returnType.type !== 63 /* NONE */) {
    astHelper_default.insertAttribute(ast, "type", functionProperties.returnType);
  }
  return functionProperties.returnType;
}

// ../gh/fontoxpath/src/typeInference/annotatePathExpr.ts
function annotatePathExpr(ast, annotationContext) {
  const steps = astHelper_default.getChildren(ast, "stepExpr");
  if (!steps) {
    return { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ };
  }
  let retType;
  for (const step of steps) {
    annotateStep(step, annotationContext);
    retType = astHelper_default.getAttribute(step, "type");
  }
  if (retType && retType.type !== 59 /* ITEM */) {
    astHelper_default.insertAttribute(ast, "type", retType);
  }
  return retType;
}
function annotateXPathAxis(axis) {
  switch (axis) {
    // Forward axis
    case "attribute": {
      return {
        type: 47 /* ATTRIBUTE */,
        mult: 2 /* ZERO_OR_MORE */
      };
    }
    case "child":
    case "decendant":
    case "self":
    case "descendant-or-self":
    case "following-sibling":
    case "following":
    case "namespace":
    // Reverse axis
    case "parent":
    case "ancestor":
    case "preceding-sibling":
    case "preceding":
    case "ancestor-or-self": {
      return {
        type: 53 /* NODE */,
        mult: 2 /* ZERO_OR_MORE */
      };
    }
  }
}
function annotateStep(step, annotationContext) {
  let seqType = null;
  const item = { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ };
  if (!step) {
    return item;
  }
  const children = astHelper_default.getChildren(step, "*");
  let axisType = "";
  for (const substep of children) {
    switch (substep[0]) {
      case "filterExpr":
        seqType = astHelper_default.getAttribute(astHelper_default.followPath(substep, ["*"]), "type");
        break;
      case "xpathAxis":
        axisType = substep[1];
        seqType = annotateXPathAxis(axisType);
        break;
      case "nameTest": {
        const qName2 = astHelper_default.getQName(substep);
        if (qName2.namespaceURI !== null) {
          break;
        }
        if (axisType === "attribute" && !qName2.prefix) {
          break;
        }
        const resolvedNamespaceURI = annotationContext.resolveNamespace(qName2.prefix || "");
        if (resolvedNamespaceURI !== void 0) {
          astHelper_default.insertAttribute(substep, "URI", resolvedNamespaceURI);
        }
        break;
      }
      case "lookup":
        seqType = { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ };
        break;
      case "attributeTest":
      case "anyElementTest":
      case "piTest":
      case "documentTest":
      case "elementTest":
      case "commentTest":
      case "namespaceTest":
      case "anyKindTest":
      case "textTest":
      case "anyFunctionTest":
      case "typedFunctionTest":
      case "schemaAttributeTest":
      case "atomicType":
      case "anyItemType":
      case "parenthesizedItemType":
      case "typedMapTest":
      case "typedArrayTest":
      case "Wildcard":
      case "predicate":
      case "predicates":
    }
  }
  if (seqType && seqType.type !== 59 /* ITEM */) {
    astHelper_default.insertAttribute(step, "type", seqType);
  }
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateQuantifiedExpr.ts
function annotateQuantifiedExpr(ast) {
  const seqType = {
    type: 0 /* XSBOOLEAN */,
    mult: 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateRangeSequenceOperator.ts
function annotateRangeSequenceOperator(ast) {
  const seqType = {
    type: 5 /* XSINTEGER */,
    mult: 1 /* ONE_OR_MORE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateSequenceOperator.ts
function annotateSequenceOperator(ast, length, elems, types) {
  let seqType;
  if (length === 0) {
    seqType = {
      type: 53 /* NODE */,
      mult: 2 /* ZERO_OR_MORE */
    };
  } else if (length === 1) {
    seqType = types[0];
  } else {
    const contatinsUndefinedOrNull = types.includes(void 0) || types.includes(null);
    if (contatinsUndefinedOrNull) {
      seqType = {
        type: 59 /* ITEM */,
        mult: 2 /* ZERO_OR_MORE */
      };
    } else {
      const uniqueTypes = filterOnUniqueObjects(types);
      seqType = uniqueTypes.length > 1 ? {
        type: 59 /* ITEM */,
        mult: 2 /* ZERO_OR_MORE */
      } : {
        type: uniqueTypes[0].type,
        mult: 2 /* ZERO_OR_MORE */
      };
    }
  }
  if (seqType && seqType.type !== 59 /* ITEM */) {
    astHelper_default.insertAttribute(ast, "type", seqType);
  }
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateSetOperators.ts
function annotateSetOperator(ast) {
  switch (ast[0]) {
    case "unionOp":
      return annotateUnionOperator(ast);
    case "intersectOp":
      return annotateIntersectOperator(ast);
    case "exceptOp":
      return annotateExceptOperator(ast);
  }
}
function annotateUnionOperator(ast) {
  const seqType = {
    type: 53 /* NODE */,
    mult: 2 /* ZERO_OR_MORE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}
function annotateIntersectOperator(ast) {
  const seqType = {
    type: 53 /* NODE */,
    mult: 2 /* ZERO_OR_MORE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}
function annotateExceptOperator(ast) {
  const seqType = {
    type: 53 /* NODE */,
    mult: 2 /* ZERO_OR_MORE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateSimpleMapExpr.ts
function annotateSimpleMapExpr(ast, context, lastType) {
  if (lastType !== void 0 && lastType !== null) {
    const sequenceType = {
      type: lastType.type,
      mult: 2 /* ZERO_OR_MORE */
    };
    if (sequenceType && sequenceType.type !== 59 /* ITEM */) {
      astHelper_default.insertAttribute(ast, "type", sequenceType);
    }
    return sequenceType;
  } else {
    return { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ };
  }
}

// ../gh/fontoxpath/src/typeInference/annotateStringConcatenateOperator.ts
function annotateStringConcatenateOperator(ast) {
  const seqType = {
    type: 1 /* XSSTRING */,
    mult: 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", seqType);
  return seqType;
}

// ../gh/fontoxpath/src/typeInference/annotateTypeSwitchOperator.ts
function annotateTypeSwitchOperator(ast, argumentType, caseClausesReturns, defaultCaseReturn) {
  if (!argumentType || caseClausesReturns.includes(void 0)) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  const caseClausesConditions = astHelper_default.getChildren(ast, "typeswitchExprCaseClause");
  for (let i4 = 0; i4 < caseClausesReturns.length; i4++) {
    const condition = astHelper_default.getFirstChild(caseClausesConditions[i4], "*");
    switch (condition[0]) {
      case "sequenceType":
        const result = checkComparison(condition, argumentType, caseClausesReturns[i4]);
        if (!result) continue;
        else {
          if (result.type !== 59 /* ITEM */) {
            astHelper_default.insertAttribute(ast, "type", result);
          }
          return result;
        }
      case "sequenceTypeUnion":
        const operands = astHelper_default.getChildren(condition, "*");
        for (let j2 = 0; j2 < 2; j2++) {
          const res = checkComparison(operands[j2], argumentType, caseClausesReturns[i4]);
          if (!res) continue;
          else {
            if (res.type !== 59 /* ITEM */) {
              astHelper_default.insertAttribute(ast, "type", res);
            }
            return res;
          }
        }
      // This should never be reached
      default:
        return {
          type: 59 /* ITEM */,
          mult: 2 /* ZERO_OR_MORE */
        };
    }
  }
  if (defaultCaseReturn.type !== 59 /* ITEM */) {
    astHelper_default.insertAttribute(ast, "type", defaultCaseReturn);
  }
  return defaultCaseReturn;
}
function checkComparison(condition, argumentType, returnType) {
  const children = astHelper_default.getChildren(condition, "*");
  const firstChild = astHelper_default.getFirstChild(condition, "atomicType");
  if (!firstChild) {
    return {
      type: 59 /* ITEM */,
      mult: 2 /* ZERO_OR_MORE */
    };
  }
  if (stringToValueType(astHelper_default.getAttribute(firstChild, "prefix") + ":" + firstChild[2]) === argumentType.type) {
    if (children.length === 1) {
      if (argumentType.mult === 3 /* EXACTLY_ONE */) {
        return returnType;
      }
    } else {
      const multiplicity = astHelper_default.getFirstChild(
        condition,
        "occurrenceIndicator"
      )[1];
      if (argumentType.mult === stringToSequenceMultiplicity(multiplicity)) {
        return returnType;
      }
    }
  }
  return void 0;
}

// ../gh/fontoxpath/src/typeInference/annotateUnaryLookup.ts
function annotateUnaryLookup(ast, ncName2) {
  return {
    type: 59 /* ITEM */,
    mult: 2 /* ZERO_OR_MORE */
  };
}

// ../gh/fontoxpath/src/typeInference/annotateUnaryOperator.ts
function annotateUnaryMinus(ast, valueType, _context) {
  if (!valueType) {
    const type = {
      type: 2 /* XSNUMERIC */,
      mult: 2 /* ZERO_OR_MORE */
    };
    astHelper_default.insertAttribute(ast, "type", type);
    return type;
  }
  if (isSubtypeOf(valueType.type, 2 /* XSNUMERIC */)) {
    const type = {
      type: valueType.type,
      mult: valueType.mult
    };
    astHelper_default.insertAttribute(ast, "type", type);
    return type;
  }
  const doubleType = {
    type: 3 /* XSDOUBLE */,
    mult: 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", doubleType);
  return doubleType;
}
function annotateUnaryPlus(ast, valueType, context) {
  if (!valueType) {
    const type = {
      type: 2 /* XSNUMERIC */,
      mult: 2 /* ZERO_OR_MORE */
    };
    astHelper_default.insertAttribute(ast, "type", type);
    return type;
  }
  if (isSubtypeOf(valueType.type, 2 /* XSNUMERIC */)) {
    const type = {
      type: valueType.type,
      mult: valueType.mult
    };
    astHelper_default.insertAttribute(ast, "type", type);
    return type;
  }
  const doubleType = {
    type: 3 /* XSDOUBLE */,
    mult: 3 /* EXACTLY_ONE */
  };
  astHelper_default.insertAttribute(ast, "type", doubleType);
  return doubleType;
}

// ../gh/fontoxpath/src/typeInference/annotateVarRef.ts
function annotateVarRef(ast, annotationContext) {
  const varName2 = astHelper_default.getQName(astHelper_default.getFirstChild(ast, "name"));
  const varType = annotationContext.getVariable(varName2.localName);
  if (varType && varType.type !== 59 /* ITEM */) {
    astHelper_default.insertAttribute(ast, "type", varType);
  }
  if (varName2.namespaceURI === null) {
    const uri = annotationContext.resolveNamespace(varName2.prefix);
    if (uri !== void 0) {
      astHelper_default.insertAttribute(ast, "URI", uri);
    }
  }
  return varType;
}

// ../gh/fontoxpath/src/typeInference/annotateAST.ts
function annotateAst(ast, context) {
  annotate(ast, context);
}
function annotate(ast, context) {
  const astNodeName = ast[0];
  const annotationFunction = annotationFunctions.get(astNodeName);
  if (annotationFunction) {
    return annotationFunction(ast, context);
  }
  for (let i4 = 1; i4 < ast.length; i4++) {
    if (ast[i4]) {
      annotate(ast[i4], context);
    }
  }
  return void 0;
}
var binopAnnotateCb = (ast, context) => {
  const left = annotate(astHelper_default.getFirstChild(ast, "firstOperand")[1], context);
  const right = annotate(astHelper_default.getFirstChild(ast, "secondOperand")[1], context);
  return annotateBinOp(ast, left, right, ast[0], context);
};
var logicOpAnnotateCb = (ast, context) => {
  annotate(astHelper_default.getFirstChild(ast, "firstOperand")[1], context);
  annotate(astHelper_default.getFirstChild(ast, "secondOperand")[1], context);
  return annotateLogicalOperator(ast);
};
var setOpAnnotateCb = (ast, context) => {
  annotate(astHelper_default.getFirstChild(ast, "firstOperand")[1], context);
  annotate(astHelper_default.getFirstChild(ast, "secondOperand")[1], context);
  return annotateSetOperator(ast);
};
var generalCompareAnnotateCb = (ast, context) => {
  annotate(astHelper_default.getFirstChild(ast, "firstOperand")[1], context);
  annotate(astHelper_default.getFirstChild(ast, "secondOperand")[1], context);
  return annotateGeneralCompare(ast);
};
var valueCompareAnnotateCb = (ast, context) => {
  annotate(astHelper_default.getFirstChild(ast, "firstOperand")[1], context);
  annotate(astHelper_default.getFirstChild(ast, "secondOperand")[1], context);
  return annotateValueCompare(ast);
};
var nodeCompareAnnotateCb = (ast, context) => {
  annotate(astHelper_default.getFirstChild(ast, "firstOperand")[1], context);
  annotate(astHelper_default.getFirstChild(ast, "secondOperand")[1], context);
  return annotateNodeCompare(ast);
};
var annotationFunctions = /* @__PURE__ */ new Map([
  [
    "unaryMinusOp",
    (ast, context) => {
      const minVal = annotate(astHelper_default.getFirstChild(ast, "operand")[1], context);
      return annotateUnaryMinus(ast, minVal, context);
    }
  ],
  [
    "unaryPlusOp",
    (ast, context) => {
      const plusVal = annotate(astHelper_default.getFirstChild(ast, "operand")[1], context);
      return annotateUnaryPlus(ast, plusVal, context);
    }
    // Binary operators
  ],
  ["addOp", binopAnnotateCb],
  ["subtractOp", binopAnnotateCb],
  ["divOp", binopAnnotateCb],
  ["idivOp", binopAnnotateCb],
  ["modOp", binopAnnotateCb],
  [
    "multiplyOp",
    binopAnnotateCb
    // And + Or operators
  ],
  ["andOp", logicOpAnnotateCb],
  [
    "orOp",
    logicOpAnnotateCb
    // Sequences
  ],
  [
    "sequenceExpr",
    (ast, context) => {
      const children = astHelper_default.getChildren(ast, "*");
      const types = children.map((a4) => annotate(a4, context));
      return annotateSequenceOperator(ast, children.length, children, types);
    }
    // Set operations (union, intersect, except)
  ],
  ["unionOp", setOpAnnotateCb],
  ["intersectOp", setOpAnnotateCb],
  [
    "exceptOp",
    setOpAnnotateCb
    // String concatentation
  ],
  [
    "stringConcatenateOp",
    (ast, context) => {
      annotate(astHelper_default.getFirstChild(ast, "firstOperand")[1], context);
      annotate(astHelper_default.getFirstChild(ast, "secondOperand")[1], context);
      return annotateStringConcatenateOperator(ast);
    }
    // Range operator
  ],
  [
    "rangeSequenceExpr",
    (ast, context) => {
      annotate(astHelper_default.getFirstChild(ast, "startExpr")[1], context);
      annotate(astHelper_default.getFirstChild(ast, "endExpr")[1], context);
      return annotateRangeSequenceOperator(ast);
    }
    // Comparison operators
  ],
  ["equalOp", generalCompareAnnotateCb],
  ["notEqualOp", generalCompareAnnotateCb],
  ["lessThanOrEqualOp", generalCompareAnnotateCb],
  ["lessThanOp", generalCompareAnnotateCb],
  ["greaterThanOrEqualOp", generalCompareAnnotateCb],
  ["greaterThanOp", generalCompareAnnotateCb],
  ["eqOp", valueCompareAnnotateCb],
  ["neOp", valueCompareAnnotateCb],
  ["ltOp", valueCompareAnnotateCb],
  ["leOp", valueCompareAnnotateCb],
  ["gtOp", valueCompareAnnotateCb],
  ["geOp", valueCompareAnnotateCb],
  ["isOp", nodeCompareAnnotateCb],
  ["nodeBeforeOp", nodeCompareAnnotateCb],
  [
    "nodeAfterOp",
    nodeCompareAnnotateCb
    // Path Expression
  ],
  [
    "pathExpr",
    (ast, context) => {
      const root = astHelper_default.getFirstChild(ast, "rootExpr");
      if (root && root[1]) annotate(root[1], context);
      astHelper_default.getChildren(ast, "stepExpr").map((b3) => annotate(b3, context));
      return annotatePathExpr(ast, context);
    }
    // Context Item
  ],
  [
    "contextItemExpr",
    (ast, _context) => {
      return annotateContextItemExpr(ast);
    }
  ],
  [
    "ifThenElseExpr",
    (ast, context) => {
      const ifClausePart = astHelper_default.getFirstChild(ast, "ifClause") || astHelper_default.getFirstChild(astHelper_default.getChildren(ast, "x:stackTrace")[0], "ifClause");
      const thenClausePart = astHelper_default.getFirstChild(ast, "thenClause") || astHelper_default.getFirstChild(
        astHelper_default.getChildren(ast, "x:stackTrace")[1],
        "thenClause"
      );
      const elseClausePart = astHelper_default.getFirstChild(ast, "elseClause") || astHelper_default.getFirstChild(
        astHelper_default.getChildren(ast, "x:stackTrace")[2],
        "elseClause"
      );
      annotate(astHelper_default.getFirstChild(ifClausePart, "*"), context);
      const thenClause = annotate(astHelper_default.getFirstChild(thenClausePart, "*"), context);
      const elseClause = annotate(astHelper_default.getFirstChild(elseClausePart, "*"), context);
      return annotateIfThenElseExpr(ast, thenClause, elseClause);
    }
  ],
  [
    "instanceOfExpr",
    (ast, context) => {
      annotate(astHelper_default.getFirstChild(ast, "argExpr"), context);
      annotate(astHelper_default.getFirstChild(ast, "sequenceType"), context);
      return annotateInstanceOfExpr(ast);
    }
    // Constant expressions
  ],
  [
    "integerConstantExpr",
    (ast, _context) => {
      const integerSequenceType = {
        type: 5 /* XSINTEGER */,
        mult: 3 /* EXACTLY_ONE */
      };
      astHelper_default.insertAttribute(ast, "type", integerSequenceType);
      return integerSequenceType;
    }
  ],
  [
    "doubleConstantExpr",
    (ast, _context) => {
      const doubleSequenceType = {
        type: 3 /* XSDOUBLE */,
        mult: 3 /* EXACTLY_ONE */
      };
      astHelper_default.insertAttribute(ast, "type", doubleSequenceType);
      return doubleSequenceType;
    }
  ],
  [
    "decimalConstantExpr",
    (ast, _context) => {
      const decimalSequenceType = {
        type: 4 /* XSDECIMAL */,
        mult: 3 /* EXACTLY_ONE */
      };
      astHelper_default.insertAttribute(ast, "type", decimalSequenceType);
      return decimalSequenceType;
    }
  ],
  [
    "stringConstantExpr",
    (ast, _context) => {
      const stringSequenceType = {
        type: 1 /* XSSTRING */,
        mult: 3 /* EXACTLY_ONE */
      };
      astHelper_default.insertAttribute(ast, "type", stringSequenceType);
      return stringSequenceType;
    }
    // Functions
  ],
  [
    "functionCallExpr",
    (ast, context) => {
      const functionArguments = astHelper_default.getFirstChild(ast, "arguments");
      const argumentTypeNodes = astHelper_default.getChildren(functionArguments, "*");
      argumentTypeNodes.map((x2) => annotate(x2, context));
      return annotateFunctionCall(ast, context);
    }
  ],
  [
    "arrowExpr",
    (ast, context) => {
      annotate(astHelper_default.getFirstChild(ast, "argExpr")[1], context);
      return annotateArrowExpr(ast, context);
    }
  ],
  [
    "dynamicFunctionInvocationExpr",
    (ast, context) => {
      const functionItem = annotate(
        astHelper_default.followPath(ast, ["functionItem", "*"]),
        context
      );
      const argNodes = astHelper_default.getFirstChild(ast, "arguments");
      const args = argNodes ? annotate(argNodes, context) : void 0;
      return annotateDynamicFunctionInvocationExpr(ast);
    }
  ],
  [
    "namedFunctionRef",
    (ast, context) => {
      return annotateNamedFunctionRef(ast, context);
    }
  ],
  [
    "inlineFunctionExpr",
    (ast, context) => {
      annotate(astHelper_default.getFirstChild(ast, "functionBody")[1], context);
      const type = { type: 60 /* FUNCTION */, mult: 3 /* EXACTLY_ONE */ };
      astHelper_default.insertAttribute(ast, "type", type);
      return type;
    }
    // Casting
  ],
  [
    "castExpr",
    (ast, _context) => {
      return annotateCastOperator(ast);
    }
  ],
  [
    "castableExpr",
    (ast, _context) => {
      return annotateCastableOperator(ast);
    }
    // Maps
  ],
  [
    "simpleMapExpr",
    (ast, context) => {
      const pathExpressions = astHelper_default.getChildren(ast, "pathExpr");
      let lastType;
      for (let i4 = 0; i4 < pathExpressions.length; i4++) {
        lastType = annotate(pathExpressions[i4], context);
      }
      return annotateSimpleMapExpr(ast, context, lastType);
    }
  ],
  [
    "mapConstructor",
    (ast, context) => {
      astHelper_default.getChildren(ast, "mapConstructorEntry").map((keyValuePair) => ({
        key: annotate(astHelper_default.followPath(keyValuePair, ["mapKeyExpr", "*"]), context),
        value: annotate(astHelper_default.followPath(keyValuePair, ["mapValueExpr", "*"]), context)
      }));
      return annotateMapConstructor(ast);
    }
    // Arrays
  ],
  [
    "arrayConstructor",
    (ast, context) => {
      astHelper_default.getChildren(astHelper_default.getFirstChild(ast, "*"), "arrayElem").map((arrayElem) => annotate(arrayElem, context));
      return annotateArrayConstructor(ast);
    }
    // Unary Lookup
  ],
  [
    "unaryLookup",
    (ast, _context) => {
      const ncName2 = astHelper_default.getFirstChild(ast, "NCName");
      return annotateUnaryLookup(ast, ncName2);
    }
    // TypeSwitch
  ],
  [
    "typeswitchExpr",
    (ast, context) => {
      const argumentType = annotate(
        astHelper_default.getFirstChild(ast, "argExpr")[1],
        context
      );
      const caseClausesReturns = astHelper_default.getChildren(ast, "typeswitchExprCaseClause").map((a4) => annotate(astHelper_default.followPath(a4, ["resultExpr"])[1], context));
      const defaultCaseReturn = annotate(
        astHelper_default.followPath(ast, ["typeswitchExprDefaultClause", "resultExpr"])[1],
        context
      );
      return annotateTypeSwitchOperator(
        ast,
        argumentType,
        caseClausesReturns,
        defaultCaseReturn
      );
    }
  ],
  [
    "quantifiedExpr",
    (ast, context) => {
      astHelper_default.getChildren(ast, "*").map((a4) => annotate(a4, context));
      return annotateQuantifiedExpr(ast);
    }
  ],
  [
    "x:stackTrace",
    (ast, context) => {
      const children = astHelper_default.getChildren(ast, "*");
      return annotate(children[0], context);
    }
  ],
  [
    "queryBody",
    (ast, context) => {
      const type = annotate(ast[1], context);
      return type;
    }
  ],
  [
    "flworExpr",
    (ast, context) => {
      return annotateFlworExpression(ast, context, annotate);
    }
  ],
  [
    "varRef",
    (ast, context) => {
      return annotateVarRef(ast, context);
    }
  ]
]);

// ../gh/fontoxpath/src/typeInference/AnnotationContext.ts
var AnnotationContext = class {
  constructor(staticContext) {
    this._scopeIndex = 0;
    this.staticContext = staticContext;
    this._variableScope = [{}];
    this._namespaceScope = [{}];
  }
  getVariable(varName2) {
    for (let i4 = this._scopeIndex; i4 >= 0; i4--) {
      const variableType = this._variableScope[i4][varName2];
      if (variableType) {
        return variableType;
      }
    }
    return void 0;
  }
  insertVariable(varName2, varType) {
    if (this._variableScope[this._scopeIndex][varName2]) {
      throw new Error(
        `Another variable of in the scope ${this._scopeIndex} with the same name ${varName2} already exists`
      );
    }
    this._variableScope[this._scopeIndex][varName2] = varType;
  }
  popScope() {
    if (this._scopeIndex > 0) {
      this._scopeIndex--;
      this._variableScope.pop();
      this._namespaceScope.pop();
      return;
    }
    throw new Error("Variable scope out of bound");
  }
  pushScope() {
    this._scopeIndex++;
    this._variableScope.push({});
    this._namespaceScope.push({});
  }
  registerNamespace(prefix2, uri) {
    this._namespaceScope[this._scopeIndex][prefix2] = uri;
  }
  resolveNamespace(prefix2) {
    for (let i4 = this._scopeIndex; i4 >= 0; i4--) {
      const namespaceURI = this._namespaceScope[i4][prefix2];
      if (namespaceURI !== void 0) {
        return namespaceURI;
      }
    }
    return this.staticContext ? this.staticContext.resolveNamespace(prefix2) : void 0;
  }
};

// ../gh/fontoxpath/src/expressions/xpath-40/Otherwise.ts
var Otherwise = class extends PossiblyUpdatingExpression {
  constructor(expressions, type) {
    const maxSpecificity = expressions.reduce((maxSpecificitySoFar, expression) => {
      if (maxSpecificitySoFar.compareTo(expression.specificity) > 0) {
        return maxSpecificitySoFar;
      }
      return expression.specificity;
    }, new Specificity_default({}));
    super(
      maxSpecificity,
      expressions,
      {
        canBeStaticallyEvaluated: expressions.every(
          (expression) => expression.canBeStaticallyEvaluated
        )
      },
      type
    );
  }
  performFunctionalEvaluation(dynamicContext, _executionParameters, sequenceCallbacks) {
    for (const cb of sequenceCallbacks) {
      const sequence2 = cb(dynamicContext);
      if (!sequence2.isEmpty()) {
        return sequence2;
      }
    }
    return sequenceFactory_default.empty();
  }
};
var Otherwise_default = Otherwise;

// ../gh/fontoxpath/src/expressions/util/Bucket.ts
var subBucketsByBucket = /* @__PURE__ */ new Map([
  ["type-1-or-type-2", ["name", "type-1", "type-2"]],
  ["type-1", ["name"]],
  ["type-2", ["name"]]
]);
var superBucketsByBucket = /* @__PURE__ */ new Map([
  ["name", "type-1-or-type-2"],
  ["type-1", "type-1-or-type-2"],
  ["type-2", "type-1-or-type-2"]
]);
function intersectBuckets(bucket1, bucket2) {
  if (bucket1 === null) {
    return bucket2;
  }
  if (bucket2 === null) {
    return bucket1;
  }
  if (bucket1 === bucket2) {
    return bucket1;
  }
  const type1 = bucket1.startsWith("name-") ? "name" : bucket1;
  const type2 = bucket2.startsWith("name-") ? "name" : bucket2;
  const subtypes1 = subBucketsByBucket.get(type1);
  if (subtypes1 !== void 0 && subtypes1.includes(type2)) {
    return bucket2;
  }
  const subtypes2 = subBucketsByBucket.get(type2);
  if (subtypes2 !== void 0 && subtypes2.includes(type1)) {
    return bucket1;
  }
  return "empty";
}
function unionBucket(bucket1, bucket2) {
  if (bucket1 === null || bucket2 === null) {
    return null;
  }
  if (bucket1 === "empty") {
    return bucket2;
  }
  if (bucket2 === "empty") {
    return bucket1;
  }
  if (bucket1 === bucket2) {
    return bucket1;
  }
  const type1 = bucket1.startsWith("name-") ? "name" : bucket1;
  const type2 = bucket2.startsWith("name-") ? "name" : bucket2;
  const supertypes1 = superBucketsByBucket.get(type1);
  if (supertypes1 !== void 0 && supertypes1 === type2) {
    return supertypes1;
  }
  const supertypes2 = superBucketsByBucket.get(type2);
  if (supertypes2 !== void 0 && supertypes2 === type1) {
    return supertypes2;
  }
  if (supertypes1 === supertypes2) {
    return supertypes1;
  }
  return null;
}

// ../gh/fontoxpath/src/expressions/tests/TestAbstractExpression.ts
var TestAbstractExpression = class extends Expression_default {
  constructor(specificity) {
    super(specificity, [], { canBeStaticallyEvaluated: false });
  }
  evaluate(dynamicContext, executionParameters) {
    return this.evaluateToBoolean(
      dynamicContext,
      dynamicContext.contextItem,
      executionParameters
    ) ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
  }
};
var TestAbstractExpression_default = TestAbstractExpression;

// ../gh/fontoxpath/src/expressions/tests/UnionNodeTest.ts
var UnionNodeTest = class extends TestAbstractExpression_default {
  constructor(subTests) {
    const maxSpecificity = subTests.reduce((currentMaxSpecificity, selector) => {
      if (currentMaxSpecificity.compareTo(selector.specificity) > 0) {
        return currentMaxSpecificity;
      }
      return selector.specificity;
    }, new Specificity_default({}));
    super(maxSpecificity);
    let bucket;
    for (let i4 = 0; i4 < subTests.length; ++i4) {
      const subTestBucket = subTests[i4].getBucket();
      if (bucket === void 0) {
        bucket = subTestBucket;
      }
      if (bucket === null) {
        break;
      }
      bucket = unionBucket(bucket, subTestBucket);
    }
    this._bucket = bucket;
    this._subTests = subTests;
  }
  evaluateToBoolean(dynamicContext, value, executionParameters) {
    return this._subTests.some((test) => {
      const result = test.evaluateToBoolean(dynamicContext, value, executionParameters);
      return result;
    });
  }
  getBucket() {
    return this._bucket;
  }
  performStaticEvaluation(staticContext) {
    this._subTests.forEach((test) => test.performStaticEvaluation(staticContext));
  }
};
var UnionNodeTest_default = UnionNodeTest;

// ../gh/fontoxpath/src/expressions/arrays/CurlyArrayConstructor.ts
var CurlyArrayConstructor = class extends Expression_default {
  constructor(members, type) {
    super(
      new Specificity_default({
        [Specificity_default.EXTERNAL_KIND]: 1
      }),
      members,
      {
        canBeStaticallyEvaluated: members.every(
          (member) => member.canBeStaticallyEvaluated
        )
      },
      false,
      type
    );
    this._members = members;
  }
  evaluate(dynamicContext, executionParameters) {
    if (this._members.length === 0) {
      return sequenceFactory_default.singleton(new ArrayValue_default([]));
    }
    return this._members[0].evaluateMaybeStatically(dynamicContext, executionParameters).mapAll(
      (allValues) => sequenceFactory_default.singleton(
        new ArrayValue_default(
          allValues.map(
            (item) => createDoublyIterableSequence(sequenceFactory_default.singleton(item))
          )
        )
      )
    );
  }
};
var CurlyArrayConstructor_default = CurlyArrayConstructor;

// ../gh/fontoxpath/src/expressions/arrays/SquareArrayConstructor.ts
var SquareArrayConstructor = class extends Expression_default {
  constructor(members, type) {
    super(
      new Specificity_default({
        [Specificity_default.EXTERNAL_KIND]: 1
      }),
      members,
      {
        canBeStaticallyEvaluated: members.every(
          (member) => member.canBeStaticallyEvaluated
        )
      },
      false,
      type
    );
    this._members = members;
  }
  evaluate(dynamicContext, executionParameters) {
    return sequenceFactory_default.singleton(
      new ArrayValue_default(
        this._members.map(
          (entry) => createDoublyIterableSequence(
            entry.evaluateMaybeStatically(dynamicContext, executionParameters)
          )
        )
      )
    );
  }
};
var SquareArrayConstructor_default = SquareArrayConstructor;

// ../gh/fontoxpath/src/expressions/axes/validateContextNode.ts
function validateContextNode(value) {
  if (value === null) {
    throw errXPDY0002("context is absent, it needs to be present to use axes.");
  }
  if (!isSubtypeOf(value.type, 53 /* NODE */)) {
    throw new Error("XPTY0020: Axes can only be applied to nodes.");
  }
  return value.value;
}

// ../gh/fontoxpath/src/expressions/axes/AncestorAxis.ts
function generateAncestors(domFacade2, contextPointer, bucket) {
  let ancestor = contextPointer;
  return {
    next: () => {
      if (!ancestor) {
        return DONE_TOKEN;
      }
      const previousAncestor = ancestor;
      ancestor = domFacade2.getParentNodePointer(previousAncestor, bucket);
      return ready(createPointerValue(previousAncestor, domFacade2));
    }
  };
}
var AncestorAxis = class extends Expression_default {
  constructor(ancestorExpression, options) {
    options = options || { inclusive: false };
    super(ancestorExpression.specificity, [ancestorExpression], {
      resultOrder: "reverse-sorted" /* REVERSE_SORTED */,
      peer: false,
      subtree: false,
      canBeStaticallyEvaluated: false
    });
    this._ancestorExpression = ancestorExpression;
    this._isInclusive = !!options.inclusive;
  }
  evaluate(dynamicContext, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    const contextPointer = validateContextNode(dynamicContext.contextItem);
    const ancestorExpressionBucket = this._ancestorExpression.getBucket();
    const onlyElementAncestors = ancestorExpressionBucket && (ancestorExpressionBucket.startsWith("name-") || ancestorExpressionBucket === "type-1");
    const ancestorAxisBucket = onlyElementAncestors ? "type-1" : null;
    return sequenceFactory_default.create(
      generateAncestors(
        domFacade2,
        this._isInclusive ? contextPointer : domFacade2.getParentNodePointer(
          contextPointer,
          ancestorAxisBucket
        ),
        ancestorAxisBucket
      )
    ).filter((item) => {
      return this._ancestorExpression.evaluateToBoolean(
        dynamicContext,
        item,
        executionParameters
      );
    });
  }
};
var AncestorAxis_default = AncestorAxis;

// ../gh/fontoxpath/src/expressions/axes/AttributeAxis.ts
var AttributeAxis = class extends Expression_default {
  constructor(attributeTestExpression, filterBucket) {
    super(
      new Specificity_default({
        [Specificity_default.ATTRIBUTE_KIND]: 1
      }),
      [attributeTestExpression],
      {
        resultOrder: "unsorted" /* UNSORTED */,
        subtree: true,
        peer: true,
        canBeStaticallyEvaluated: false
      }
    );
    this._attributeTestExpression = attributeTestExpression;
    this._filterBucket = intersectBuckets(
      this._attributeTestExpression.getBucket(),
      filterBucket
    );
  }
  evaluate(dynamicContext, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    const contextItem = validateContextNode(dynamicContext.contextItem);
    if (domFacade2.getNodeType(contextItem) !== 1 /* ELEMENT_NODE */) {
      return sequenceFactory_default.empty();
    }
    const matchingAttributes = domFacade2.getAllAttributePointers(contextItem, this._filterBucket).filter(
      (attr) => domFacade2.getNamespaceURI(attr) !== "http://www.w3.org/2000/xmlns/" /* XMLNS_NAMESPACE_URI */
    ).map((attribute) => createPointerValue(attribute, executionParameters.domFacade)).filter(
      (item) => this._attributeTestExpression.evaluateToBoolean(
        dynamicContext,
        item,
        executionParameters
      )
    );
    return sequenceFactory_default.create(matchingAttributes);
  }
  getBucket() {
    return "type-1";
  }
};
var AttributeAxis_default = AttributeAxis;

// ../gh/fontoxpath/src/expressions/axes/ChildAxis.ts
var ChildAxis = class extends Expression_default {
  constructor(childExpression, filterBucket) {
    super(childExpression.specificity, [childExpression], {
      resultOrder: "sorted" /* SORTED */,
      subtree: true,
      peer: true,
      canBeStaticallyEvaluated: false
    });
    this._childExpression = childExpression;
    this._filterBucket = intersectBuckets(filterBucket, childExpression.getBucket());
  }
  evaluate(dynamicContext, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    const contextNode = validateContextNode(dynamicContext.contextItem);
    const nodeType = domFacade2.getNodeType(contextNode);
    if (nodeType !== 1 /* ELEMENT_NODE */ && nodeType !== 9 /* DOCUMENT_NODE */) {
      return sequenceFactory_default.empty();
    }
    let node = null;
    let isDone = false;
    return sequenceFactory_default.create({
      next: () => {
        while (!isDone) {
          if (!node) {
            node = domFacade2.getFirstChildPointer(
              contextNode,
              this._filterBucket
            );
            if (!node) {
              isDone = true;
              continue;
            }
            return ready(createPointerValue(node, domFacade2));
          }
          node = domFacade2.getNextSiblingPointer(node, this._filterBucket);
          if (!node) {
            isDone = true;
            continue;
          }
          return ready(createPointerValue(node, domFacade2));
        }
        return DONE_TOKEN;
      }
    }).filter((item) => {
      return this._childExpression.evaluateToBoolean(
        dynamicContext,
        item,
        executionParameters
      );
    });
  }
};
var ChildAxis_default = ChildAxis;

// ../gh/fontoxpath/src/expressions/util/createChildGenerator.ts
function createChildGenerator(domFacade2, pointer, bucket) {
  const nodeType = domFacade2.getNodeType(pointer);
  if (nodeType !== 1 /* ELEMENT_NODE */ && nodeType !== 9 /* DOCUMENT_NODE */) {
    return {
      next: () => {
        return DONE_TOKEN;
      }
    };
  }
  let childNode = domFacade2.getFirstChildPointer(pointer, bucket);
  return {
    next() {
      if (!childNode) {
        return DONE_TOKEN;
      }
      const current = childNode;
      childNode = domFacade2.getNextSiblingPointer(childNode, bucket);
      return ready(current);
    }
  };
}

// ../gh/fontoxpath/src/expressions/axes/DescendantAxis.ts
function createInclusiveDescendantGenerator(domFacade2, node, bucket) {
  const descendantIteratorStack = [
    createSingleValueIterator(node)
  ];
  return {
    next: (hint) => {
      if (descendantIteratorStack.length > 0 && (hint & 1 /* SKIP_DESCENDANTS */) !== 0) {
        descendantIteratorStack.shift();
      }
      if (!descendantIteratorStack.length) {
        return DONE_TOKEN;
      }
      let value = descendantIteratorStack[0].next(0 /* NONE */);
      while (value.done) {
        descendantIteratorStack.shift();
        if (!descendantIteratorStack.length) {
          return DONE_TOKEN;
        }
        value = descendantIteratorStack[0].next(0 /* NONE */);
      }
      descendantIteratorStack.unshift(createChildGenerator(domFacade2, value.value, bucket));
      return ready(createPointerValue(value.value, domFacade2));
    }
  };
}
var DescendantAxis = class extends Expression_default {
  constructor(descendantExpression, options) {
    options = options || { inclusive: false };
    super(descendantExpression.specificity, [descendantExpression], {
      canBeStaticallyEvaluated: false,
      peer: false,
      resultOrder: "sorted" /* SORTED */,
      subtree: true
    });
    this._descendantExpression = descendantExpression;
    this._isInclusive = !!options.inclusive;
    const testBucket = this._descendantExpression.getBucket();
    const onlyElementDescendants = testBucket && (testBucket.startsWith("name-") || testBucket === "type-1") || testBucket === "type-1-or-type-2";
    this._descendantBucket = onlyElementDescendants ? "type-1" : null;
  }
  evaluate(dynamicContext, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    const contextPointer = validateContextNode(dynamicContext.contextItem);
    const inclusive = this._isInclusive;
    const iterator = createInclusiveDescendantGenerator(
      domFacade2,
      contextPointer,
      this._descendantBucket
    );
    if (!inclusive) {
      iterator.next(0 /* NONE */);
    }
    const descendantSequence = sequenceFactory_default.create(iterator);
    return descendantSequence.filter((item) => {
      return this._descendantExpression.evaluateToBoolean(
        dynamicContext,
        item,
        executionParameters
      );
    });
  }
};
var DescendantAxis_default = DescendantAxis;

// ../gh/fontoxpath/src/expressions/util/createDescendantGenerator.ts
function findDeepestLastDescendant(pointer, domFacade2, bucket) {
  const nodeType = domFacade2.getNodeType(pointer);
  if (nodeType !== 1 /* ELEMENT_NODE */ && nodeType !== 9 /* DOCUMENT_NODE */) {
    return pointer;
  }
  let parentNode = pointer;
  let childNode = domFacade2.getLastChildPointer(parentNode, bucket);
  while (childNode !== null) {
    if (domFacade2.getNodeType(childNode) !== 1 /* ELEMENT_NODE */) {
      return childNode;
    }
    parentNode = childNode;
    childNode = domFacade2.getLastChildPointer(parentNode, bucket);
  }
  return parentNode;
}
function createDescendantGenerator(domFacade2, pointer, returnInReverse = false, bucket) {
  if (returnInReverse) {
    let currentPointer = pointer;
    let isDone = false;
    return {
      next: () => {
        if (isDone) {
          return DONE_TOKEN;
        }
        if (arePointersEqual_default(currentPointer, pointer)) {
          currentPointer = findDeepestLastDescendant(pointer, domFacade2, bucket);
          if (arePointersEqual_default(currentPointer, pointer)) {
            isDone = true;
            return DONE_TOKEN;
          }
          return ready(createPointerValue(currentPointer, domFacade2));
        }
        const nodeType = domFacade2.getNodeType(currentPointer);
        const previousSibling = nodeType === 9 /* DOCUMENT_NODE */ || nodeType === 2 /* ATTRIBUTE_NODE */ ? null : domFacade2.getPreviousSiblingPointer(
          currentPointer,
          bucket
        );
        if (previousSibling !== null) {
          currentPointer = findDeepestLastDescendant(previousSibling, domFacade2, bucket);
          return ready(createPointerValue(currentPointer, domFacade2));
        }
        currentPointer = nodeType === 9 /* DOCUMENT_NODE */ ? null : domFacade2.getParentNodePointer(
          currentPointer,
          bucket
        );
        if (arePointersEqual_default(currentPointer, pointer)) {
          isDone = true;
          return DONE_TOKEN;
        }
        return ready(createPointerValue(currentPointer, domFacade2));
      }
    };
  }
  const descendantIteratorStack = [createChildGenerator(domFacade2, pointer, bucket)];
  return {
    next: () => {
      if (!descendantIteratorStack.length) {
        return DONE_TOKEN;
      }
      let value = descendantIteratorStack[0].next(0 /* NONE */);
      while (value.done) {
        descendantIteratorStack.shift();
        if (!descendantIteratorStack.length) {
          return DONE_TOKEN;
        }
        value = descendantIteratorStack[0].next(0 /* NONE */);
      }
      descendantIteratorStack.unshift(createChildGenerator(domFacade2, value.value, bucket));
      return ready(createPointerValue(value.value, domFacade2));
    }
  };
}

// ../gh/fontoxpath/src/expressions/axes/FollowingAxis.ts
function createFollowingGenerator(domFacade2, node, bucket) {
  const nodeStack = [];
  for (
    let ancestorNode = node;
    ancestorNode && domFacade2.getNodeType(ancestorNode) !== 9 /* DOCUMENT_NODE */;
    // Any parent can contain the node we want
    ancestorNode = domFacade2.getParentNodePointer(ancestorNode, null)
  ) {
    const previousSibling = domFacade2.getNextSiblingPointer(
      ancestorNode,
      bucket
    );
    if (previousSibling) {
      nodeStack.push(previousSibling);
    }
  }
  let nephewGenerator = null;
  return {
    next: () => {
      while (nephewGenerator || nodeStack.length) {
        if (!nephewGenerator) {
          nephewGenerator = createDescendantGenerator(
            domFacade2,
            nodeStack[0],
            false,
            bucket
          );
          const toReturn = ready(createPointerValue(nodeStack[0], domFacade2));
          const nextNode = domFacade2.getNextSiblingPointer(
            nodeStack[0],
            bucket
          );
          if (!nextNode) {
            nodeStack.shift();
          } else {
            nodeStack[0] = nextNode;
          }
          return toReturn;
        }
        const nephew = nephewGenerator.next(0 /* NONE */);
        if (nephew.done) {
          nephewGenerator = null;
          continue;
        }
        return nephew;
      }
      return DONE_TOKEN;
    }
  };
}
var FollowingAxis = class extends Expression_default {
  constructor(testExpression) {
    super(testExpression.specificity, [testExpression], {
      resultOrder: "sorted" /* SORTED */,
      peer: true,
      subtree: false,
      canBeStaticallyEvaluated: false
    });
    this._testExpression = testExpression;
    const testBucket = this._testExpression.getBucket();
    const onlyElementDescendants = testBucket && (testBucket.startsWith("name-") || testBucket === "type-1");
    this._bucket = onlyElementDescendants ? "type-1" : null;
  }
  evaluate(dynamicContext, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    const contextPointer = validateContextNode(dynamicContext.contextItem);
    return sequenceFactory_default.create(
      createFollowingGenerator(
        domFacade2,
        contextPointer,
        this._bucket
      )
    ).filter((item) => {
      return this._testExpression.evaluateToBoolean(
        dynamicContext,
        item,
        executionParameters
      );
    });
  }
};
var FollowingAxis_default = FollowingAxis;

// ../gh/fontoxpath/src/expressions/axes/FollowingSiblingAxis.ts
function createSiblingGenerator(domFacade2, node, bucket) {
  return {
    next: () => {
      node = node && domFacade2.getNextSiblingPointer(node, bucket);
      if (!node) {
        return DONE_TOKEN;
      }
      return ready(createPointerValue(node, domFacade2));
    }
  };
}
var FollowingSiblingAxis = class extends Expression_default {
  constructor(siblingExpression, filterBucket) {
    super(siblingExpression.specificity, [siblingExpression], {
      resultOrder: "sorted" /* SORTED */,
      peer: true,
      subtree: false,
      canBeStaticallyEvaluated: false
    });
    this._siblingExpression = siblingExpression;
    this._filterBucket = intersectBuckets(this._siblingExpression.getBucket(), filterBucket);
  }
  evaluate(dynamicContext, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    const contextPointer = validateContextNode(dynamicContext.contextItem);
    return sequenceFactory_default.create(createSiblingGenerator(domFacade2, contextPointer, this._filterBucket)).filter((item) => {
      return this._siblingExpression.evaluateToBoolean(
        dynamicContext,
        item,
        executionParameters
      );
    });
  }
};
var FollowingSiblingAxis_default = FollowingSiblingAxis;

// ../gh/fontoxpath/src/expressions/axes/ParentAxis.ts
var ParentAxis = class extends Expression_default {
  constructor(parentExpression, filterBucket) {
    super(parentExpression.specificity, [parentExpression], {
      resultOrder: "reverse-sorted" /* REVERSE_SORTED */,
      peer: true,
      subtree: true,
      canBeStaticallyEvaluated: false
    });
    this._parentExpression = parentExpression;
    this._filterBucket = intersectBuckets(filterBucket, this._parentExpression.getBucket());
  }
  evaluate(dynamicContext, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    const contextPointer = validateContextNode(dynamicContext.contextItem);
    const parentNode = domFacade2.getParentNodePointer(
      contextPointer,
      this._filterBucket
    );
    if (!parentNode) {
      return sequenceFactory_default.empty();
    }
    const parentNodeValue = createPointerValue(parentNode, executionParameters.domFacade);
    const nodeIsMatch = this._parentExpression.evaluateToBoolean(
      dynamicContext,
      parentNodeValue,
      executionParameters
    );
    if (!nodeIsMatch) {
      return sequenceFactory_default.empty();
    }
    return sequenceFactory_default.singleton(parentNodeValue);
  }
};
var ParentAxis_default = ParentAxis;

// ../gh/fontoxpath/src/expressions/axes/PrecedingAxis.ts
function createPrecedingGenerator(domFacade2, node, bucket) {
  const nodeStack = [];
  for (
    let ancestorNode = node;
    ancestorNode && domFacade2.getNodeType(ancestorNode) !== 9 /* DOCUMENT_NODE */;
    // Any parent can contain the node we want. documents AND elements
    ancestorNode = domFacade2.getParentNodePointer(ancestorNode, null)
  ) {
    const previousSibling = domFacade2.getPreviousSiblingPointer(ancestorNode, bucket);
    if (previousSibling === null) {
      continue;
    }
    nodeStack.push(previousSibling);
  }
  let nephewGenerator = null;
  return {
    next: () => {
      while (nephewGenerator || nodeStack.length) {
        if (!nephewGenerator) {
          nephewGenerator = createDescendantGenerator(
            domFacade2,
            nodeStack[0],
            true,
            bucket
          );
        }
        const nephew = nephewGenerator.next(0 /* NONE */);
        if (nephew.done) {
          nephewGenerator = null;
          const nextNode = domFacade2.getPreviousSiblingPointer(
            nodeStack[0],
            bucket
          );
          const toReturn = ready(createPointerValue(nodeStack[0], domFacade2));
          if (nextNode === null) {
            nodeStack.shift();
          } else {
            nodeStack[0] = nextNode;
          }
          return toReturn;
        }
        return nephew;
      }
      return DONE_TOKEN;
    }
  };
}
var PrecedingAxis = class extends Expression_default {
  constructor(testExpression) {
    super(testExpression.specificity, [testExpression], {
      canBeStaticallyEvaluated: false,
      peer: true,
      resultOrder: "reverse-sorted" /* REVERSE_SORTED */,
      subtree: false
    });
    this._testExpression = testExpression;
    const testBucket = this._testExpression.getBucket();
    const onlyElementDescendants = testBucket && (testBucket.startsWith("name-") || testBucket === "type-1");
    this._bucket = onlyElementDescendants ? "type-1" : null;
  }
  evaluate(dynamicContext, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    const contextPointer = validateContextNode(dynamicContext.contextItem);
    return sequenceFactory_default.create(
      createPrecedingGenerator(
        domFacade2,
        contextPointer,
        this._bucket
      )
    ).filter((item) => {
      return this._testExpression.evaluateToBoolean(
        dynamicContext,
        item,
        executionParameters
      );
    });
  }
};
var PrecedingAxis_default = PrecedingAxis;

// ../gh/fontoxpath/src/expressions/axes/PrecedingSiblingAxis.ts
function createSiblingGenerator2(domFacade2, node, bucket) {
  return {
    next: () => {
      node = node && domFacade2.getPreviousSiblingPointer(node, bucket);
      if (!node) {
        return DONE_TOKEN;
      }
      return ready(createPointerValue(node, domFacade2));
    }
  };
}
var PrecedingSiblingAxis = class extends Expression_default {
  constructor(siblingExpression, filterBucket) {
    super(siblingExpression.specificity, [siblingExpression], {
      canBeStaticallyEvaluated: false,
      peer: true,
      resultOrder: "reverse-sorted" /* REVERSE_SORTED */,
      subtree: false
    });
    this._siblingExpression = siblingExpression;
    this._filterBucket = intersectBuckets(this._siblingExpression.getBucket(), filterBucket);
  }
  evaluate(dynamicContext, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    const contextPointer = validateContextNode(dynamicContext.contextItem);
    return sequenceFactory_default.create(createSiblingGenerator2(domFacade2, contextPointer, this._filterBucket)).filter((item) => {
      return this._siblingExpression.evaluateToBoolean(
        dynamicContext,
        item,
        executionParameters
      );
    });
  }
};
var PrecedingSiblingAxis_default = PrecedingSiblingAxis;

// ../gh/fontoxpath/src/expressions/axes/SelfAxis.ts
var SelfAxis = class extends Expression_default {
  constructor(selector, filterBucket) {
    super(selector.specificity, [selector], {
      resultOrder: "sorted" /* SORTED */,
      subtree: true,
      peer: true,
      canBeStaticallyEvaluated: false
    });
    this._selector = selector;
    this._bucket = intersectBuckets(this._selector.getBucket(), filterBucket);
  }
  evaluate(dynamicContext, executionParameters) {
    validateContextNode(dynamicContext.contextItem);
    const isMatch = this._selector.evaluateToBoolean(
      dynamicContext,
      dynamicContext.contextItem,
      executionParameters
    );
    return isMatch ? sequenceFactory_default.singleton(dynamicContext.contextItem) : sequenceFactory_default.empty();
  }
  getBucket() {
    return this._bucket;
  }
};
var SelfAxis_default = SelfAxis;

// ../gh/fontoxpath/src/expressions/conditional/IfExpression.ts
var IfExpression = class extends PossiblyUpdatingExpression {
  constructor(testExpression, thenExpression, elseExpression, type) {
    const specificity = testExpression.specificity.add(thenExpression.specificity).add(elseExpression.specificity);
    super(
      specificity,
      [testExpression, thenExpression, elseExpression],
      {
        canBeStaticallyEvaluated: testExpression.canBeStaticallyEvaluated && thenExpression.canBeStaticallyEvaluated && elseExpression.canBeStaticallyEvaluated,
        peer: thenExpression.peer === elseExpression.peer && thenExpression.peer,
        resultOrder: thenExpression.expectedResultOrder === elseExpression.expectedResultOrder ? thenExpression.expectedResultOrder : "unsorted" /* UNSORTED */,
        subtree: thenExpression.subtree === elseExpression.subtree && thenExpression.subtree
      },
      type
    );
    this._testExpression = testExpression;
  }
  performFunctionalEvaluation(dynamicContext, _executionParameters, sequenceCallbacks) {
    let resultIterator = null;
    const ifExpressionResultSequence = sequenceCallbacks[0](dynamicContext);
    return sequenceFactory_default.create({
      next: (hint) => {
        if (!resultIterator) {
          const ifExpressionResult = ifExpressionResultSequence.getEffectiveBooleanValue();
          const resultSequence = ifExpressionResult ? sequenceCallbacks[1](dynamicContext) : sequenceCallbacks[2](dynamicContext);
          resultIterator = resultSequence.value;
        }
        return resultIterator.next(hint);
      }
    });
  }
  performStaticEvaluation(staticContext) {
    super.performStaticEvaluation(staticContext);
    if (this._testExpression.isUpdating) {
      throw errXUST0001();
    }
  }
};
var IfExpression_default = IfExpression;

// ../gh/fontoxpath/src/expressions/debug/StackTraceEntry.ts
var StackTraceEntry = class {
  constructor(location, innerExpressionType, comment2, innerTrace) {
    this.location = location;
    this.innerExpressionType = innerExpressionType;
    this.comment = comment2;
    this.innerTrace = innerTrace;
  }
  getErrorLocation() {
    return this.innerTrace instanceof Error ? this.location : this.innerTrace.getErrorLocation();
  }
  makeStackTrace() {
    let innerStackTrace;
    if (this.innerTrace instanceof PositionedError) {
      innerStackTrace = ["Inner error:", this.innerTrace.message];
    } else if (this.innerTrace instanceof Error) {
      innerStackTrace = [this.innerTrace.toString()];
    } else {
      innerStackTrace = this.innerTrace.makeStackTrace();
    }
    innerStackTrace.push(
      `  at <${this.innerExpressionType}${this.comment ? ` (${this.comment})` : ""}>:${this.location.start.line}:${this.location.start.column} - ${this.location.end.line}:${this.location.end.column}`
    );
    return innerStackTrace;
  }
};

// ../gh/fontoxpath/src/expressions/debug/StackTraceGenerator.ts
var StackTraceGenerator = class extends PossiblyUpdatingExpression {
  constructor(location, innerExpressionType, innerExpression, comment2) {
    super(innerExpression.specificity, [innerExpression], {
      canBeStaticallyEvaluated: innerExpression.canBeStaticallyEvaluated,
      peer: innerExpression.peer,
      resultOrder: innerExpression.expectedResultOrder,
      subtree: innerExpression.subtree
    });
    this._innerExpressionType = innerExpressionType;
    this._location = {
      end: {
        column: location.end.column,
        line: location.end.line,
        offset: location.end.offset
      },
      start: {
        column: location.start.column,
        line: location.start.line,
        offset: location.start.offset
      }
    };
    this._comment = comment2;
  }
  performFunctionalEvaluation(dynamicContext, _executionParameters, [sequenceCallback]) {
    let innerSequence;
    try {
      innerSequence = sequenceCallback(dynamicContext);
    } catch (error) {
      throw new StackTraceEntry(
        this._location,
        this._innerExpressionType,
        this._comment,
        error
      );
    }
    return sequenceFactory_default.create({
      next: (hint) => {
        try {
          return innerSequence.value.next(hint);
        } catch (error) {
          throw new StackTraceEntry(
            this._location,
            this._innerExpressionType,
            this._comment,
            error
          );
        }
      }
    });
  }
  performStaticEvaluation(staticContext) {
    try {
      super.performStaticEvaluation(staticContext);
    } catch (error) {
      throw new StackTraceEntry(
        this._location,
        this._innerExpressionType,
        this._comment,
        error
      );
    }
  }
  getBucket() {
    return this._childExpressions[0].getBucket();
  }
};

// ../gh/fontoxpath/src/expressions/FlworExpression.ts
var FlworExpression = class _FlworExpression extends Expression_default {
  constructor(specificity, childExpressions, optimizationOptions, returnExpression) {
    super(specificity, childExpressions, optimizationOptions, true);
    this._returnExpression = returnExpression;
    this.isUpdating = this._returnExpression.isUpdating;
  }
  doFlworExpressionUpdating(outerDynamicContext, outerDynamicContextIterator, executionParameters) {
    let updateList = [];
    const sequence2 = this.doFlworExpression(
      outerDynamicContext,
      outerDynamicContextIterator,
      executionParameters,
      (dynamicContextIterator) => {
        if (this._returnExpression instanceof _FlworExpression) {
          const updateListAndValue = this._returnExpression.doFlworExpressionUpdating(
            outerDynamicContext,
            dynamicContextIterator,
            executionParameters
          );
          return separateXDMValueFromUpdatingExpressionResult(
            updateListAndValue,
            (pendingUpdates) => updateList = pendingUpdates
          );
        }
        let currentReturnValueGenerator = null;
        return sequenceFactory_default.create({
          next: (_hint) => {
            while (true) {
              if (!currentReturnValueGenerator) {
                const currentDynamicContext = dynamicContextIterator.next(
                  0 /* NONE */
                );
                if (currentDynamicContext.done) {
                  return DONE_TOKEN;
                }
                const updateListAndValue = this._returnExpression.evaluateWithUpdateList(
                  currentDynamicContext.value,
                  executionParameters
                );
                currentReturnValueGenerator = separateXDMValueFromUpdatingExpressionResult(
                  updateListAndValue,
                  (pendingUpdates) => updateList = mergeUpdates(updateList, pendingUpdates)
                ).value;
              }
              const nextValue = currentReturnValueGenerator.next(0 /* NONE */);
              if (nextValue.done) {
                currentReturnValueGenerator = null;
                continue;
              }
              return nextValue;
            }
          }
        });
      }
    );
    let done = false;
    return {
      next: (_hint) => {
        if (done) {
          return DONE_TOKEN;
        }
        const allValues = sequence2.getAllValues();
        done = true;
        return ready(new UpdatingExpressionResult(allValues, updateList));
      }
    };
  }
  evaluate(dynamicContext, executionParameters) {
    return this.doFlworExpression(
      dynamicContext,
      createSingleValueIterator(dynamicContext),
      executionParameters,
      (dynamicContextIterator) => {
        if (this._returnExpression instanceof _FlworExpression) {
          return this._returnExpression.doFlworExpressionInternal(
            dynamicContext,
            dynamicContextIterator,
            executionParameters
          );
        }
        let currentSequenceIterator = null;
        return sequenceFactory_default.create({
          next: (hint) => {
            while (true) {
              if (!currentSequenceIterator) {
                const temp = dynamicContextIterator.next(0 /* NONE */);
                if (temp.done) {
                  return DONE_TOKEN;
                }
                currentSequenceIterator = this._returnExpression.evaluateMaybeStatically(
                  temp.value,
                  executionParameters
                ).value;
              }
              const nextValue = currentSequenceIterator.next(hint);
              if (nextValue.done) {
                currentSequenceIterator = null;
                continue;
              }
              return nextValue;
            }
          }
        });
      }
    );
  }
  evaluateWithUpdateList(dynamicContext, executionParameters) {
    return this.doFlworExpressionUpdating(
      dynamicContext,
      createSingleValueIterator(dynamicContext),
      executionParameters
    );
  }
  performStaticEvaluation(staticContext) {
    super.performStaticEvaluation(staticContext);
    this.isUpdating = this._returnExpression.isUpdating;
    for (const childExpression of this._childExpressions) {
      if (childExpression === this._returnExpression) {
        continue;
      }
      if (childExpression.isUpdating) {
        throw errXUST0001();
      }
    }
  }
  doFlworExpressionInternal(outerDynamicContext, outerDynamicContextIterator, executionParameters) {
    return this.doFlworExpression(
      outerDynamicContext,
      outerDynamicContextIterator,
      executionParameters,
      (dynamicContextIterator) => {
        if (this._returnExpression instanceof _FlworExpression) {
          return this._returnExpression.doFlworExpressionInternal(
            outerDynamicContext,
            dynamicContextIterator,
            executionParameters
          );
        }
        let currentSequenceIterator = null;
        return sequenceFactory_default.create({
          next: (_hint) => {
            while (true) {
              if (!currentSequenceIterator) {
                const temp = dynamicContextIterator.next(0 /* NONE */);
                if (temp.done) {
                  return DONE_TOKEN;
                }
                currentSequenceIterator = this._returnExpression.evaluateMaybeStatically(
                  temp.value,
                  executionParameters
                ).value;
              }
              const nextValue = currentSequenceIterator.next(0 /* NONE */);
              if (nextValue.done) {
                currentSequenceIterator = null;
                continue;
              }
              return nextValue;
            }
          }
        });
      }
    );
  }
};
var FlworExpression_default = FlworExpression;

// ../gh/fontoxpath/src/expressions/ForExpression.ts
var ForExpression = class extends FlworExpression_default {
  constructor(rangeVariable, clauseExpression, positionalVariableBinding, returnExpression) {
    super(
      clauseExpression.specificity.add(returnExpression.specificity),
      [clauseExpression, returnExpression],
      {
        canBeStaticallyEvaluated: false
      },
      returnExpression
    );
    this._prefix = rangeVariable.prefix;
    this._namespaceURI = rangeVariable.namespaceURI;
    this._localName = rangeVariable.localName;
    this._variableBindingKey = null;
    this._positionalVariableBinding = positionalVariableBinding;
    this._positionalVariableBindingKey = null;
    this._clauseExpression = clauseExpression;
  }
  doFlworExpression(_dynamicContext, dynamicContextIterator, executionParameters, createReturnSequence) {
    let clauseIterator = null;
    let currentDynamicContext = null;
    let position = 0;
    return createReturnSequence({
      next: (_hint) => {
        while (true) {
          if (!clauseIterator) {
            const temp = dynamicContextIterator.next(0 /* NONE */);
            if (temp.done) {
              return DONE_TOKEN;
            }
            currentDynamicContext = temp.value;
            position = 0;
            clauseIterator = this._clauseExpression.evaluateMaybeStatically(
              currentDynamicContext,
              executionParameters
            ).value;
          }
          const currentClauseValue = clauseIterator.next(0 /* NONE */);
          if (currentClauseValue.done) {
            clauseIterator = null;
            continue;
          }
          position++;
          const variables = {
            [this._variableBindingKey]: () => sequenceFactory_default.singleton(currentClauseValue.value)
          };
          if (this._positionalVariableBindingKey) {
            variables[this._positionalVariableBindingKey] = () => sequenceFactory_default.singleton(new Value(5 /* XSINTEGER */, position));
          }
          return ready(currentDynamicContext.scopeWithVariableBindings(variables));
        }
      }
    });
  }
  performStaticEvaluation(staticContext) {
    if (this._prefix) {
      this._namespaceURI = staticContext.resolveNamespace(this._prefix);
      if (!this._namespaceURI && this._prefix) {
        throw new Error(
          `XPST0081: Could not resolve namespace for prefix ${this._prefix} in a for expression`
        );
      }
    }
    this._clauseExpression.performStaticEvaluation(staticContext);
    staticContext.introduceScope();
    this._variableBindingKey = staticContext.registerVariable(
      this._namespaceURI,
      this._localName
    );
    if (this._positionalVariableBinding) {
      if (this._positionalVariableBinding.prefix) {
        this._positionalVariableBinding.namespaceURI = staticContext.resolveNamespace(
          this._positionalVariableBinding.prefix
        );
        if (!this._positionalVariableBinding.namespaceURI && this._positionalVariableBinding.prefix) {
          throw new Error(
            `XPST0081: Could not resolve namespace for prefix ${this._prefix} in the positionalVariableBinding in a for expression`
          );
        }
      }
      this._positionalVariableBindingKey = staticContext.registerVariable(
        this._positionalVariableBinding.namespaceURI,
        this._positionalVariableBinding.localName
      );
    }
    this._returnExpression.performStaticEvaluation(staticContext);
    staticContext.removeScope();
    if (this._clauseExpression.isUpdating) {
      throw errXUST0001();
    }
    if (this._returnExpression.isUpdating) {
      this.isUpdating = true;
    }
  }
};
var ForExpression_default = ForExpression;

// ../gh/fontoxpath/src/expressions/functions/InlineFunction.ts
var InlineFunction = class extends Expression_default {
  constructor(paramDescriptions, returnType, functionBody) {
    super(
      new Specificity_default({
        [Specificity_default.EXTERNAL_KIND]: 1
      }),
      [functionBody],
      {
        // inline functions may never be statically evaluated because the domfacade may be used in the function body to resolve dom relations
        canBeStaticallyEvaluated: false,
        resultOrder: "unsorted" /* UNSORTED */
      }
    );
    this._parameterNames = paramDescriptions.map(({ name: name2 }) => name2);
    this._parameterTypes = paramDescriptions.map(({ type }) => type);
    this._parameterBindingNames = null;
    this._returnType = returnType;
    this._functionBody = functionBody;
  }
  evaluate(dynamicContext, executionParameters) {
    const executeFunction = (_unboundDynamicContext, _executionParameters, _staticContext, ...parameters) => {
      const scopedDynamicContext = dynamicContext.scopeWithFocus(-1, null, sequenceFactory_default.empty()).scopeWithVariableBindings(
        this._parameterBindingNames.reduce((paramByName, bindingName, i4) => {
          paramByName[bindingName] = createDoublyIterableSequence(parameters[i4]);
          return paramByName;
        }, /* @__PURE__ */ Object.create(null))
      );
      return this._functionBody.evaluateMaybeStatically(
        scopedDynamicContext,
        executionParameters
      );
    };
    const functionItem = new FunctionValue_default({
      argumentTypes: this._parameterTypes,
      arity: this._parameterTypes.length,
      isAnonymous: true,
      isUpdating: this._functionBody.isUpdating,
      localName: "dynamic-function",
      namespaceURI: "",
      returnType: this._returnType,
      value: executeFunction
    });
    return sequenceFactory_default.singleton(functionItem);
  }
  performStaticEvaluation(staticContext) {
    staticContext.introduceScope();
    this._parameterBindingNames = this._parameterNames.map((name2) => {
      let namespaceURI = name2.namespaceURI;
      const prefix2 = name2.prefix;
      const localName = name2.localName;
      if (!namespaceURI === null && prefix2 !== "*") {
        namespaceURI = staticContext.resolveNamespace(prefix2);
      }
      return staticContext.registerVariable(namespaceURI, localName);
    });
    this._functionBody.performStaticEvaluation(staticContext);
    staticContext.removeScope();
    if (this._functionBody.isUpdating) {
      throw new Error("Not implemented: inline functions can not yet be updating.");
    }
  }
};
var InlineFunction_default = InlineFunction;

// ../gh/fontoxpath/src/expressions/LetExpression.ts
var LetExpression = class extends FlworExpression_default {
  constructor(rangeVariable, bindingSequence, returnExpression) {
    super(
      bindingSequence.specificity.add(returnExpression.specificity),
      [bindingSequence, returnExpression],
      {
        canBeStaticallyEvaluated: false,
        peer: returnExpression.peer,
        resultOrder: returnExpression.expectedResultOrder,
        subtree: returnExpression.subtree
      },
      returnExpression
    );
    if (rangeVariable.prefix || rangeVariable.namespaceURI) {
      throw new Error("Not implemented: let expressions with namespace usage.");
    }
    this._prefix = rangeVariable.prefix;
    this._namespaceURI = rangeVariable.namespaceURI;
    this._localName = rangeVariable.localName;
    this._bindingSequence = bindingSequence;
    this._variableBinding = null;
  }
  doFlworExpression(_dynamicContext, dynamicContextIterator, executionParameters, createReturnSequence) {
    return createReturnSequence({
      next: (_hint) => {
        let currentDynamicContext = null;
        const temp = dynamicContextIterator.next(0 /* NONE */);
        if (temp.done) {
          return DONE_TOKEN;
        }
        currentDynamicContext = temp.value;
        const scopedContext = currentDynamicContext.scopeWithVariableBindings({
          [this._variableBinding]: createDoublyIterableSequence(
            this._bindingSequence.evaluateMaybeStatically(
              currentDynamicContext,
              executionParameters
            )
          )
        });
        return ready(scopedContext);
      }
    });
  }
  performStaticEvaluation(staticContext) {
    if (this._prefix) {
      this._namespaceURI = staticContext.resolveNamespace(this._prefix);
      if (!this._namespaceURI && this._prefix) {
        throw new Error(
          `XPST0081: Could not resolve namespace for prefix ${this._prefix} using in a for expression`
        );
      }
    }
    this._bindingSequence.performStaticEvaluation(staticContext);
    staticContext.introduceScope();
    this._variableBinding = staticContext.registerVariable(this._namespaceURI, this._localName);
    this._returnExpression.performStaticEvaluation(staticContext);
    staticContext.removeScope();
    this.isUpdating = this._returnExpression.isUpdating;
    if (this._bindingSequence.isUpdating) {
      throw errXUST0001();
    }
  }
};
var LetExpression_default = LetExpression;

// ../gh/fontoxpath/src/expressions/literals/Literal.ts
var Literal = class extends Expression_default {
  constructor(jsValue, type) {
    super(
      new Specificity_default({}),
      [],
      {
        canBeStaticallyEvaluated: true,
        resultOrder: "sorted" /* SORTED */
      },
      false,
      type
    );
    let value;
    switch (type.type) {
      case 5 /* XSINTEGER */:
        value = createAtomicValue(parseInt(jsValue, 10), type.type);
        break;
      case 1 /* XSSTRING */:
        value = createAtomicValue(jsValue + "", type.type);
        break;
      case 4 /* XSDECIMAL */:
      case 3 /* XSDOUBLE */:
        value = createAtomicValue(parseFloat(jsValue), type.type);
        break;
      default:
        throw new TypeError("Type " + type + " not expected in a literal");
    }
    this._createValueSequence = () => sequenceFactory_default.singleton(value);
  }
  evaluate() {
    return this._createValueSequence();
  }
};
var Literal_default = Literal;

// ../gh/fontoxpath/src/expressions/maps/MapConstructor.ts
var MapConstructor = class extends Expression_default {
  /**
   * @param  entries  key-value tuples of expressions which will evaluate to key / value pairs
   */
  constructor(entries, type) {
    super(
      new Specificity_default({
        [Specificity_default.EXTERNAL_KIND]: 1
      }),
      entries.reduce(
        (allExpressions, { key, value }) => allExpressions.concat(key, value),
        []
      ),
      {
        canBeStaticallyEvaluated: false
      },
      false,
      type
    );
    this._entries = entries;
  }
  evaluate(dynamicContext, executionParameters) {
    const keySequences = this._entries.map(
      (kvp) => atomize(
        kvp.key.evaluateMaybeStatically(dynamicContext, executionParameters),
        executionParameters
      ).switchCases({
        default: () => {
          throw new Error(
            "XPTY0004: A key of a map should be a single atomizable value."
          );
        },
        singleton: (seq) => seq
      })
    );
    return zipSingleton(
      keySequences,
      (keys) => sequenceFactory_default.singleton(
        new MapValue_default(
          keys.map((key, keyIndex) => ({
            key,
            value: createDoublyIterableSequence(
              this._entries[keyIndex].value.evaluateMaybeStatically(
                dynamicContext,
                executionParameters
              )
            )
          }))
        )
      )
    );
  }
};
var MapConstructor_default = MapConstructor;

// ../gh/fontoxpath/src/expressions/NamedFunctionRef.ts
function buildFormattedFunctionName(functionReference) {
  return `${functionReference.namespaceURI ? `Q{${functionReference.namespaceURI}}` : functionReference.prefix ? `${functionReference.prefix}:` : ""}${functionReference.localName}`;
}
var NamedFunctionRef = class extends Expression_default {
  constructor(functionReference, arity, type) {
    super(
      new Specificity_default({
        [Specificity_default.EXTERNAL_KIND]: 1
      }),
      [],
      {
        canBeStaticallyEvaluated: true
      },
      false,
      type
    );
    this._arity = arity;
    this._functionReference = functionReference;
    this._functionProperties = null;
  }
  evaluate() {
    const functionItem = new FunctionValue_default({
      argumentTypes: this._functionProperties.argumentTypes,
      isUpdating: this._functionProperties.isUpdating,
      arity: this._arity,
      localName: this._functionProperties.localName,
      namespaceURI: this._functionProperties.namespaceURI,
      returnType: this._functionProperties.returnType,
      value: this._functionProperties.callFunction
    });
    return sequenceFactory_default.singleton(functionItem);
  }
  performStaticEvaluation(staticContext) {
    let namespaceURI = this._functionReference.namespaceURI;
    let localName = this._functionReference.localName;
    const prefix2 = this._functionReference.prefix;
    if (namespaceURI === null) {
      const functionName = staticContext.resolveFunctionName(
        { localName, prefix: prefix2 },
        this._arity
      );
      if (!functionName) {
        throw new Error(
          `XPST0017: The function ${prefix2 ? prefix2 + ":" : ""}${localName} with arity ${this._arity} could not be resolved. ${getAlternativesAsStringFor(localName)}`
        );
      }
      namespaceURI = functionName.namespaceURI;
      localName = functionName.localName;
    }
    this._functionProperties = staticContext.lookupFunction(namespaceURI, localName, this._arity) || null;
    if (!this._functionProperties) {
      throw new Error(
        `XPST0017: Function ${buildFormattedFunctionName(
          this._functionReference
        )} with arity of ${this._arity} not registered. ${getAlternativesAsStringFor(
          localName
        )}`
      );
    }
    super.performStaticEvaluation(staticContext);
  }
};
var NamedFunctionRef_default = NamedFunctionRef;

// ../gh/fontoxpath/src/expressions/operators/arithmetic/Unary.ts
var UNARY_LOOKUP = {
  [5 /* XSINTEGER */]: 5 /* XSINTEGER */,
  [27 /* XSNONPOSITIVEINTEGER */]: 5 /* XSINTEGER */,
  [28 /* XSNEGATIVEINTEGER */]: 5 /* XSINTEGER */,
  [31 /* XSLONG */]: 5 /* XSINTEGER */,
  [32 /* XSINT */]: 5 /* XSINTEGER */,
  [33 /* XSSHORT */]: 5 /* XSINTEGER */,
  [34 /* XSBYTE */]: 5 /* XSINTEGER */,
  [30 /* XSNONNEGATIVEINTEGER */]: 5 /* XSINTEGER */,
  [36 /* XSUNSIGNEDLONG */]: 5 /* XSINTEGER */,
  [35 /* XSUNSIGNEDINT */]: 5 /* XSINTEGER */,
  [38 /* XSUNSIGNEDSHORT */]: 5 /* XSINTEGER */,
  [37 /* XSUNSIGNEDBYTE */]: 5 /* XSINTEGER */,
  [29 /* XSPOSITIVEINTEGER */]: 5 /* XSINTEGER */,
  [4 /* XSDECIMAL */]: 4 /* XSDECIMAL */,
  [6 /* XSFLOAT */]: 6 /* XSFLOAT */,
  [3 /* XSDOUBLE */]: 3 /* XSDOUBLE */
};
var Unary = class extends Expression_default {
  /**
   * Positivese or negativise a value: +1 = 1, -1 = 0 - 1, -1 + 2 = 1, --1 = 1, etc
   *
   * @param  kind       Either + or -
   * @param  valueExpr  The selector evaluating to the value to process
   */
  constructor(kind, valueExpr, type) {
    super(valueExpr.specificity, [valueExpr], { canBeStaticallyEvaluated: false }, false, type);
    this._valueExpr = valueExpr;
    this._kind = kind;
  }
  evaluate(dynamicContext, executionParameters) {
    return atomize(
      this._valueExpr.evaluateMaybeStatically(dynamicContext, executionParameters),
      executionParameters
    ).mapAll((atomizedValues) => {
      if (atomizedValues.length === 0) {
        return sequenceFactory_default.empty();
      }
      const value = atomizedValues[0];
      if (this.type) {
        let finalValue = this._kind === "+" ? +value.value : -value.value;
        if (value.type === 0 /* XSBOOLEAN */) finalValue = Number.NaN;
        return sequenceFactory_default.singleton(createAtomicValue(finalValue, this.type.type));
      }
      if (atomizedValues.length > 1) {
        throw new Error(
          "XPTY0004: The operand to a unary operator must be a sequence with a length less than one"
        );
      }
      if (isSubtypeOf(value.type, 19 /* XSUNTYPEDATOMIC */)) {
        const castValue = castToType(value, 3 /* XSDOUBLE */).value;
        return sequenceFactory_default.singleton(
          createAtomicValue(
            this._kind === "+" ? castValue : -castValue,
            3 /* XSDOUBLE */
          )
        );
      }
      if (isSubtypeOf(value.type, 2 /* XSNUMERIC */)) {
        if (this._kind === "+") {
          return sequenceFactory_default.singleton(value);
        }
        return sequenceFactory_default.singleton(
          createAtomicValue(value.value * -1, UNARY_LOOKUP[value.type])
        );
      }
      return sequenceFactory_default.singleton(createAtomicValue(Number.NaN, 3 /* XSDOUBLE */));
    });
  }
};
var Unary_default = Unary;

// ../gh/fontoxpath/src/expressions/operators/boolean/AndOperator.ts
var AndOperator = class extends Expression_default {
  constructor(expressions, type) {
    super(
      expressions.reduce((specificity, selector) => {
        return specificity.add(selector.specificity);
      }, new Specificity_default({})),
      expressions,
      {
        canBeStaticallyEvaluated: expressions.every(
          (selector) => selector.canBeStaticallyEvaluated
        )
      },
      false,
      type
    );
    this._subExpressions = expressions;
    this._bucket = expressions.reduce(
      (bucket, expression) => intersectBuckets(bucket, expression.getBucket()),
      null
    );
  }
  evaluate(dynamicContext, executionParameters) {
    let i4 = 0;
    let resultSequence = null;
    let done = false;
    let contextItemBuckets = null;
    if (dynamicContext !== null) {
      const contextItem = dynamicContext.contextItem;
      if (contextItem !== null && isSubtypeOf(contextItem.type, 53 /* NODE */)) {
        contextItemBuckets = getBucketsForPointer(
          contextItem.value,
          executionParameters.domFacade
        );
      }
    }
    return sequenceFactory_default.create({
      next: () => {
        if (!done) {
          while (i4 < this._subExpressions.length) {
            if (!resultSequence) {
              const subExpression = this._subExpressions[i4];
              if (contextItemBuckets !== null && subExpression.getBucket() !== null) {
                if (!contextItemBuckets.includes(subExpression.getBucket())) {
                  i4++;
                  done = true;
                  return ready(falseBoolean);
                }
              }
              resultSequence = subExpression.evaluateMaybeStatically(
                dynamicContext,
                executionParameters
              );
            }
            const ebv = resultSequence.getEffectiveBooleanValue();
            if (ebv === false) {
              done = true;
              return ready(falseBoolean);
            }
            resultSequence = null;
            i4++;
          }
          done = true;
          return ready(trueBoolean);
        }
        return DONE_TOKEN;
      }
    });
  }
  getBucket() {
    return this._bucket;
  }
};
var AndOperator_default = AndOperator;

// ../gh/fontoxpath/src/expressions/operators/boolean/OrOperator.ts
var OrOperator = class extends Expression_default {
  constructor(expressions, type) {
    const maxSpecificity = expressions.reduce((currentMaxSpecificity, selector) => {
      if (currentMaxSpecificity.compareTo(selector.specificity) > 0) {
        return currentMaxSpecificity;
      }
      return selector.specificity;
    }, new Specificity_default({}));
    super(
      maxSpecificity,
      expressions,
      {
        canBeStaticallyEvaluated: expressions.every(
          (selector) => selector.canBeStaticallyEvaluated
        )
      },
      false,
      type
    );
    let bucket;
    for (let i4 = 0; i4 < expressions.length; ++i4) {
      const subTestBucket = expressions[i4].getBucket();
      if (bucket === void 0) {
        bucket = subTestBucket;
      }
      if (bucket === null) {
        break;
      }
      bucket = unionBucket(bucket, subTestBucket);
    }
    this._bucket = bucket;
    this._subExpressions = expressions;
  }
  evaluate(dynamicContext, executionParameters) {
    let i4 = 0;
    let resultSequence = null;
    let done = false;
    let contextItemBuckets = null;
    if (dynamicContext !== null) {
      const contextItem = dynamicContext.contextItem;
      if (contextItem !== null && isSubtypeOf(contextItem.type, 53 /* NODE */)) {
        contextItemBuckets = getBucketsForPointer(
          contextItem.value,
          executionParameters.domFacade
        );
      }
    }
    return sequenceFactory_default.create({
      next: () => {
        if (!done) {
          while (i4 < this._subExpressions.length) {
            if (!resultSequence) {
              const subExpression = this._subExpressions[i4];
              if (contextItemBuckets !== null && subExpression.getBucket() !== null) {
                if (!contextItemBuckets.includes(subExpression.getBucket())) {
                  i4++;
                  continue;
                }
              }
              resultSequence = subExpression.evaluateMaybeStatically(
                dynamicContext,
                executionParameters
              );
            }
            const ebv = resultSequence.getEffectiveBooleanValue();
            if (ebv === true) {
              done = true;
              return ready(trueBoolean);
            }
            resultSequence = null;
            i4++;
          }
          done = true;
          return ready(falseBoolean);
        }
        return DONE_TOKEN;
      }
    });
  }
  getBucket() {
    return this._bucket;
  }
};
var OrOperator_default = OrOperator;

// ../gh/fontoxpath/src/expressions/util/atomizeSequence.ts
function atomizeSequence(sequence2, executionParameters) {
  let currentSequence;
  return sequenceFactory_default.create({
    next: (iterationHint) => {
      while (true) {
        if (!currentSequence) {
          const value = sequence2.value.next(iterationHint);
          if (value.done) {
            return DONE_TOKEN;
          }
          currentSequence = atomizeSingleValue(value.value, executionParameters);
        }
        const atomizedValue = currentSequence.value.next(iterationHint);
        if (atomizedValue.done) {
          currentSequence = null;
          continue;
        }
        return atomizedValue;
      }
    }
  });
}

// ../gh/fontoxpath/src/expressions/operators/compares/ValueCompare.ts
function handleQName(operator, applyCastFunctions) {
  if (operator === "eqOp") {
    return (a4, b3, _dynamicContext) => {
      const { castA, castB } = applyCastFunctions(a4, b3);
      return castA.value.namespaceURI === castB.value.namespaceURI && castA.value.localName === castB.value.localName;
    };
  }
  if (operator === "neOp") {
    return (a4, b3, _dynamicContext) => {
      const { castA, castB } = applyCastFunctions(a4, b3);
      return castA.value.namespaceURI !== castB.value.namespaceURI || castA.value.localName !== castB.value.localName;
    };
  }
  throw new Error('XPTY0004: Only the "eq" and "ne" comparison is defined for xs:QName');
}
function handleNumeric(operator, applyCastFunctions) {
  switch (operator) {
    case "eqOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value === castB.value;
      };
    case "neOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value !== castB.value;
      };
    case "ltOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value < castB.value;
      };
    case "leOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value <= castB.value;
      };
    case "gtOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value > castB.value;
      };
    case "geOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value >= castB.value;
      };
    default:
      return void 0;
  }
}
function handleYearMonthDuration(operator, applyCastFunctions) {
  switch (operator) {
    case "ltOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return lessThan3(castA.value, castB.value);
      };
    case "leOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value.equals(castB.value) || lessThan3(castA.value, castB.value);
      };
    case "gtOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return greaterThan3(castA.value, castB.value);
      };
    case "geOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value.equals(castB.value) || greaterThan3(castA.value, castB.value);
      };
    default:
      return void 0;
  }
}
function handleDayTimeDuration(operator, applyCastFunctions) {
  switch (operator) {
    case "eqOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value.equals(castB.value);
      };
    case "ltOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return lessThan(castA.value, castB.value);
      };
    case "leOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value.equals(castB.value) || lessThan(castA.value, castB.value);
      };
    case "gtOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return greaterThan(castA.value, castB.value);
      };
    case "geOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value.equals(castB.value) || greaterThan(castA.value, castB.value);
      };
    default:
      return void 0;
  }
}
function handleDuration(operator, applyCastFunctions) {
  switch (operator) {
    case "eqOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return castA.value.equals(castB.value);
      };
    case "neOp":
      return (a4, b3, _dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return !castA.value.equals(castB.value);
      };
    default:
      return void 0;
  }
}
function handleDateAndTime(operator, applyCastFunctions) {
  switch (operator) {
    case "eqOp":
      return (a4, b3, dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return equal(
          castA.value,
          castB.value,
          dynamicContext.getImplicitTimezone()
        );
      };
    case "neOp":
      return (a4, b3, dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return !equal(
          castA.value,
          castB.value,
          dynamicContext.getImplicitTimezone()
        );
      };
    case "ltOp":
      return (a4, b3, dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return lessThan2(
          castA.value,
          castB.value,
          dynamicContext.getImplicitTimezone()
        );
      };
    case "leOp":
      return (a4, b3, dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return equal(castA.value, castB.value, dynamicContext.getImplicitTimezone()) || lessThan2(castA.value, castB.value, dynamicContext.getImplicitTimezone());
      };
    case "gtOp":
      return (a4, b3, dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return greaterThan2(
          castA.value,
          castB.value,
          dynamicContext.getImplicitTimezone()
        );
      };
    case "geOp":
      return (a4, b3, dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return equal(castA.value, castB.value, dynamicContext.getImplicitTimezone()) || greaterThan2(
          castA.value,
          castB.value,
          dynamicContext.getImplicitTimezone()
        );
      };
    default:
      return void 0;
  }
}
function handleDayMonthAndYear(operator, applyCastFunctions) {
  switch (operator) {
    case "eqOp":
      return (a4, b3, dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return equal(
          castA.value,
          castB.value,
          dynamicContext.getImplicitTimezone()
        );
      };
    case "neOp":
      return (a4, b3, dynamicContext) => {
        const { castA, castB } = applyCastFunctions(a4, b3);
        return !equal(
          castA.value,
          castB.value,
          dynamicContext.getImplicitTimezone()
        );
      };
    default:
      return void 0;
  }
}
function generateCompareFunction(operator, typeA, typeB) {
  let castFunctionForValueA = null;
  let castFunctionForValueB = null;
  if (isSubtypeOf(typeA, 19 /* XSUNTYPEDATOMIC */) && isSubtypeOf(typeB, 19 /* XSUNTYPEDATOMIC */)) {
    typeA = typeB = 1 /* XSSTRING */;
  } else if (isSubtypeOf(typeA, 19 /* XSUNTYPEDATOMIC */)) {
    castFunctionForValueA = (val) => castToType(val, typeB);
    typeA = typeB;
  } else if (isSubtypeOf(typeB, 19 /* XSUNTYPEDATOMIC */)) {
    castFunctionForValueB = (val) => castToType(val, typeA);
    typeB = typeA;
  }
  function applyCastFunctions(valA, valB) {
    return {
      castA: castFunctionForValueA ? castFunctionForValueA(valA) : valA,
      castB: castFunctionForValueB ? castFunctionForValueB(valB) : valB
    };
  }
  if (isSubtypeOf(typeA, 23 /* XSQNAME */) && isSubtypeOf(typeB, 23 /* XSQNAME */)) {
    return handleQName(operator, applyCastFunctions);
  }
  function areBothSubtypeOf(type) {
    return isSubtypeOf(typeA, type) && isSubtypeOf(typeB, type);
  }
  function areBothSubtypeOfOne(types) {
    return types.filter((x2) => isSubtypeOf(typeA, x2)).length > 0 && types.filter((x2) => isSubtypeOf(typeB, x2)).length > 0;
  }
  if (areBothSubtypeOf(0 /* XSBOOLEAN */) || // If something is marked as an attribute its either a string or a number
  areBothSubtypeOfOne([1 /* XSSTRING */, 47 /* ATTRIBUTE */, 61 /* MAP */]) || areBothSubtypeOfOne([2 /* XSNUMERIC */, 47 /* ATTRIBUTE */, 61 /* MAP */]) || areBothSubtypeOf(20 /* XSANYURI */) || areBothSubtypeOf(22 /* XSHEXBINARY */) || areBothSubtypeOf(21 /* XSBASE64BINARY */) || areBothSubtypeOfOne([1 /* XSSTRING */, 20 /* XSANYURI */])) {
    const result = handleNumeric(operator, applyCastFunctions);
    if (result !== void 0) {
      return result;
    }
  }
  if (areBothSubtypeOf(16 /* XSYEARMONTHDURATION */)) {
    const result = handleYearMonthDuration(operator, applyCastFunctions);
    if (result !== void 0) {
      return result;
    }
  }
  if (areBothSubtypeOf(17 /* XSDAYTIMEDURATION */)) {
    const result = handleDayTimeDuration(operator, applyCastFunctions);
    if (result !== void 0) {
      return result;
    }
  }
  if (areBothSubtypeOf(18 /* XSDURATION */)) {
    const result = handleDuration(operator, applyCastFunctions);
    if (result !== void 0) {
      return result;
    }
  }
  if (areBothSubtypeOf(9 /* XSDATETIME */) || areBothSubtypeOf(7 /* XSDATE */) || areBothSubtypeOf(8 /* XSTIME */)) {
    const result = handleDateAndTime(operator, applyCastFunctions);
    if (result !== void 0) {
      return result;
    }
  }
  if (areBothSubtypeOf(11 /* XSGYEARMONTH */) || areBothSubtypeOf(12 /* XSGYEAR */) || areBothSubtypeOf(13 /* XSGMONTHDAY */) || areBothSubtypeOf(14 /* XSGMONTH */) || areBothSubtypeOf(15 /* XSGDAY */)) {
    const result = handleDayMonthAndYear(operator, applyCastFunctions);
    if (result !== void 0) {
      return result;
    }
  }
  throw new Error(
    `XPTY0004: ${operator} not available for ${valueTypeToString(
      typeA
    )} and ${valueTypeToString(typeB)}`
  );
}
var comparatorsByTypingKey = /* @__PURE__ */ Object.create(null);
function valueCompare(operator, typeA, typeB) {
  const typingKey = `${typeA}~${typeB}~${operator}`;
  let prefabComparator = comparatorsByTypingKey[typingKey];
  if (!prefabComparator) {
    prefabComparator = comparatorsByTypingKey[typingKey] = generateCompareFunction(
      operator,
      typeA,
      typeB
    );
  }
  return prefabComparator;
}
var ValueCompare = class extends Expression_default {
  constructor(kind, firstExpression, secondExpression) {
    super(
      firstExpression.specificity.add(secondExpression.specificity),
      [firstExpression, secondExpression],
      {
        canBeStaticallyEvaluated: false
      }
    );
    this._firstExpression = firstExpression;
    this._secondExpression = secondExpression;
    this._operator = kind;
  }
  evaluate(dynamicContext, executionParameters) {
    const firstSequence = this._firstExpression.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    const secondSequence = this._secondExpression.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    const firstAtomizedSequence = atomizeSequence(firstSequence, executionParameters);
    const secondAtomizedSequence = atomizeSequence(secondSequence, executionParameters);
    return firstAtomizedSequence.switchCases({
      empty: () => sequenceFactory_default.empty(),
      singleton: () => secondAtomizedSequence.switchCases({
        empty: () => sequenceFactory_default.empty(),
        singleton: () => {
          const onlyFirstValue = firstAtomizedSequence.first();
          const onlySecondValue = secondAtomizedSequence.first();
          const compareFunction = valueCompare(
            this._operator,
            onlyFirstValue.type,
            onlySecondValue.type
          );
          return compareFunction(onlyFirstValue, onlySecondValue, dynamicContext) ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
        },
        multiple: () => {
          throw new Error("XPTY0004: Sequences to compare are not singleton.");
        }
      }),
      multiple: () => {
        throw new Error("XPTY0004: Sequences to compare are not singleton.");
      }
    });
  }
};

// ../gh/fontoxpath/src/expressions/operators/compares/GeneralCompare.ts
var OPERATOR_TRANSLATION = {
  ["equalOp"]: "eqOp",
  ["notEqualOp"]: "neOp",
  ["lessThanOrEqualOp"]: "leOp",
  ["lessThanOp"]: "ltOp",
  ["greaterThanOrEqualOp"]: "geOp",
  ["greaterThanOp"]: "gtOp"
};
function determineTargetType(firstType, secondType) {
  let firstTargetType;
  let secondTargetType;
  if (isSubtypeOf(firstType, 19 /* XSUNTYPEDATOMIC */) || isSubtypeOf(secondType, 19 /* XSUNTYPEDATOMIC */)) {
    if (isSubtypeOf(firstType, 2 /* XSNUMERIC */)) {
      secondTargetType = 3 /* XSDOUBLE */;
    } else if (isSubtypeOf(secondType, 2 /* XSNUMERIC */)) {
      firstTargetType = 3 /* XSDOUBLE */;
    } else if (isSubtypeOf(firstType, 17 /* XSDAYTIMEDURATION */)) {
      secondTargetType = 17 /* XSDAYTIMEDURATION */;
    } else if (isSubtypeOf(secondType, 17 /* XSDAYTIMEDURATION */)) {
      firstTargetType = 17 /* XSDAYTIMEDURATION */;
    } else if (isSubtypeOf(firstType, 16 /* XSYEARMONTHDURATION */)) {
      secondTargetType = 16 /* XSYEARMONTHDURATION */;
    } else if (isSubtypeOf(secondType, 16 /* XSYEARMONTHDURATION */)) {
      firstTargetType = 16 /* XSYEARMONTHDURATION */;
    } else if (isSubtypeOf(firstType, 19 /* XSUNTYPEDATOMIC */)) {
      firstTargetType = secondType;
    } else if (isSubtypeOf(secondType, 19 /* XSUNTYPEDATOMIC */)) {
      secondTargetType = firstType;
    }
  }
  return [firstTargetType, secondTargetType];
}
function generalCompare(operator, firstSequence, secondSequence, dynamicContext) {
  operator = OPERATOR_TRANSLATION[operator];
  return secondSequence.mapAll(
    (allSecondValues) => firstSequence.filter((firstValue) => {
      for (let i4 = 0, l3 = allSecondValues.length; i4 < l3; ++i4) {
        let secondValue = allSecondValues[i4];
        const [firstTargetType, secondTargetType] = determineTargetType(firstValue.type, secondValue.type);
        if (firstTargetType) firstValue = castToType(firstValue, firstTargetType);
        else if (secondTargetType)
          secondValue = castToType(secondValue, secondTargetType);
        const compareFunction = valueCompare(
          operator,
          firstValue.type,
          secondValue.type
        );
        if (compareFunction(firstValue, secondValue, dynamicContext)) {
          return true;
        }
      }
      return false;
    }).switchCases({
      default: () => sequenceFactory_default.singletonTrueSequence(),
      empty: () => sequenceFactory_default.singletonFalseSequence()
    })
  );
}
var GeneralCompare = class extends Expression_default {
  constructor(kind, firstExpression, secondExpression) {
    super(
      firstExpression.specificity.add(secondExpression.specificity),
      [firstExpression, secondExpression],
      {
        canBeStaticallyEvaluated: false
      }
    );
    this._firstExpression = firstExpression;
    this._secondExpression = secondExpression;
    this._operator = kind;
  }
  evaluate(dynamicContext, executionParameters) {
    const firstSequence = this._firstExpression.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    const secondSequence = this._secondExpression.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    return firstSequence.switchCases({
      empty: () => {
        return sequenceFactory_default.singletonFalseSequence();
      },
      default: () => secondSequence.switchCases({
        empty: () => {
          return sequenceFactory_default.singletonFalseSequence();
        },
        default: () => {
          const firstAtomizedSequence = atomizeSequence(
            firstSequence,
            executionParameters
          );
          const secondAtomizedSequence = atomizeSequence(
            secondSequence,
            executionParameters
          );
          return generalCompare(
            this._operator,
            firstAtomizedSequence,
            secondAtomizedSequence,
            dynamicContext
          );
        }
      })
    });
  }
};

// ../gh/fontoxpath/src/expressions/operators/compares/NodeCompare.ts
function nodeCompare(operator, domFacade2, first, second) {
  if (!isSubtypeOf(first, 53 /* NODE */) || !isSubtypeOf(second, 53 /* NODE */)) {
    throw new Error("XPTY0004: Sequences to compare are not nodes");
  }
  switch (operator) {
    case "isOp":
      return isOpHandler(first, second);
    case "nodeBeforeOp":
      if (!domFacade2) {
        return void 0;
      }
      return (firstSequenceParam, secondSequenceParam) => {
        return compareNodePositions(
          domFacade2,
          firstSequenceParam.first(),
          secondSequenceParam.first()
        ) < 0;
      };
    case "nodeAfterOp":
      if (!domFacade2) {
        return void 0;
      }
      return (firstSequenceParam, secondSequenceParam) => {
        return compareNodePositions(
          domFacade2,
          firstSequenceParam.first(),
          secondSequenceParam.first()
        ) > 0;
      };
    default:
      throw new Error("Unexpected operator");
  }
}
function isOpHandler(first, second) {
  return first === second && (first === 47 /* ATTRIBUTE */ || first === 53 /* NODE */ || first === 54 /* ELEMENT */ || first === 55 /* DOCUMENTNODE */ || first === 56 /* TEXT */ || first === 57 /* PROCESSINGINSTRUCTION */ || first === 58 /* COMMENT */) ? (firstSequenceParam, secondSequenceParam, _context) => {
    return arePointersEqual_default(
      firstSequenceParam.first().value,
      secondSequenceParam.first().value
    );
  } : (firstSequenceParam, secondSequenceParam) => false;
}
var NodeCompare = class extends Expression_default {
  constructor(kind, firstExpression, secondExpression) {
    super(
      firstExpression.specificity.add(secondExpression.specificity),
      [firstExpression, secondExpression],
      {
        canBeStaticallyEvaluated: false
      }
    );
    this._firstExpression = firstExpression;
    this._secondExpression = secondExpression;
    this._operator = kind;
  }
  evaluate(dynamicContext, executionParameters) {
    const firstSequence = this._firstExpression.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    const secondSequence = this._secondExpression.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    return firstSequence.switchCases({
      empty: () => {
        return sequenceFactory_default.empty();
      },
      multiple: () => {
        throw new Error("XPTY0004: Sequences to compare are not singleton");
      },
      singleton: () => secondSequence.switchCases({
        empty: () => {
          return sequenceFactory_default.empty();
        },
        multiple: () => {
          throw new Error("XPTY0004: Sequences to compare are not singleton");
        },
        singleton: () => {
          const first = firstSequence.first();
          const second = secondSequence.first();
          const compareFunction = nodeCompare(
            this._operator,
            executionParameters.domFacade,
            first.type,
            second.type
          );
          return compareFunction(firstSequence, secondSequence, dynamicContext) ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
        }
      })
    });
  }
};

// ../gh/fontoxpath/src/expressions/operators/IntersectExcept.ts
function ensureSortedSequence(intersectOrExcept, domFacade2, sequence2, expectedResultOrder) {
  return sequence2.mapAll((values) => {
    if (values.some((value) => !isSubtypeOf(value.type, 53 /* NODE */))) {
      throw new Error(
        `XPTY0004: Sequences given to ${intersectOrExcept} should only contain nodes.`
      );
    }
    if (expectedResultOrder === "sorted" /* SORTED */) {
      return sequenceFactory_default.create(values);
    }
    if (expectedResultOrder === "reverse-sorted" /* REVERSE_SORTED */) {
      return sequenceFactory_default.create(values.reverse());
    }
    return sequenceFactory_default.create(sortNodeValues(domFacade2, values));
  });
}
var IntersectExcept = class extends Expression_default {
  constructor(intersectOrExcept, expression1, expression2, type) {
    const maxSpecificity = expression1.specificity.compareTo(expression2.specificity) > 0 ? expression1.specificity : expression2.specificity;
    super(
      maxSpecificity,
      [expression1, expression2],
      {
        canBeStaticallyEvaluated: expression1.canBeStaticallyEvaluated && expression2.canBeStaticallyEvaluated
      },
      false,
      type
    );
    this._intersectOrExcept = intersectOrExcept;
    this._expression1 = expression1;
    this._expression2 = expression2;
  }
  evaluate(dynamicContext, executionParameters) {
    const firstResult = ensureSortedSequence(
      this._intersectOrExcept,
      executionParameters.domFacade,
      this._expression1.evaluateMaybeStatically(dynamicContext, executionParameters),
      this._expression1.expectedResultOrder
    );
    const secondResult = ensureSortedSequence(
      this._intersectOrExcept,
      executionParameters.domFacade,
      this._expression2.evaluateMaybeStatically(dynamicContext, executionParameters),
      this._expression2.expectedResultOrder
    );
    const firstIterator = firstResult.value;
    const secondIterator = secondResult.value;
    let firstValue = null;
    let secondValue = null;
    let done = false;
    let secondIteratorDone = false;
    return sequenceFactory_default.create({
      next: (_hint) => {
        if (done) {
          return DONE_TOKEN;
        }
        while (!secondIteratorDone) {
          if (!firstValue) {
            const itrResult = firstIterator.next(0 /* NONE */);
            if (itrResult.done) {
              done = true;
              return DONE_TOKEN;
            }
            firstValue = itrResult.value;
          }
          if (!secondValue) {
            const itrResult = secondIterator.next(0 /* NONE */);
            if (itrResult.done) {
              secondIteratorDone = true;
              break;
            }
            secondValue = itrResult.value;
          }
          if (arePointersEqual_default(firstValue.value, secondValue.value)) {
            const toReturn = ready(firstValue);
            firstValue = null;
            secondValue = null;
            if (this._intersectOrExcept === "intersectOp") {
              return toReturn;
            }
            continue;
          }
          const comparisonResult = compareNodePositions(
            executionParameters.domFacade,
            firstValue,
            secondValue
          );
          if (comparisonResult < 0) {
            const toReturn = ready(firstValue);
            firstValue = null;
            if (this._intersectOrExcept === "exceptOp") {
              return toReturn;
            }
          } else {
            secondValue = null;
          }
        }
        if (this._intersectOrExcept === "exceptOp") {
          if (firstValue !== null) {
            const toReturn = ready(firstValue);
            firstValue = null;
            return toReturn;
          }
          return firstIterator.next(0 /* NONE */);
        }
        done = true;
        return DONE_TOKEN;
      }
    });
  }
};
var IntersectExcept_default = IntersectExcept;

// ../gh/fontoxpath/src/expressions/operators/SequenceOperator.ts
var SequenceOperator = class extends PossiblyUpdatingExpression {
  constructor(expressions, type) {
    super(
      expressions.reduce((specificity, selector) => {
        return specificity.add(selector.specificity);
      }, new Specificity_default({})),
      expressions,
      {
        resultOrder: "unsorted" /* UNSORTED */,
        canBeStaticallyEvaluated: expressions.every(
          (selector) => selector.canBeStaticallyEvaluated
        )
      },
      type
    );
  }
  performFunctionalEvaluation(dynamicContext, _executionParameters, sequenceCallbacks) {
    if (!sequenceCallbacks.length) {
      return sequenceFactory_default.empty();
    }
    return concatSequences(sequenceCallbacks.map((cb) => cb(dynamicContext)));
  }
};
var SequenceOperator_default = SequenceOperator;

// ../gh/fontoxpath/src/expressions/operators/SimpleMapOperator.ts
var SimpleMapOperator = class extends Expression_default {
  /**
   * Simple Map operator
   * The simple map operator will evaluate expressions given in expression1 and use the results as context for
   * evaluating all expressions in expression2. Returns a sequence with results from the evaluation of expression2.
   * Order is undefined.
   */
  constructor(expression1, expression2, type) {
    super(
      new Specificity_default({}).add(expression1.specificity),
      [expression1, expression2],
      {
        canBeStaticallyEvaluated: expression1.canBeStaticallyEvaluated && expression2.canBeStaticallyEvaluated
      },
      false,
      type
    );
    this._expression1 = expression1;
    this._expression2 = expression2;
  }
  evaluate(dynamicContext, executionParameters) {
    const sequence2 = this._expression1.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    const childContextIterator = dynamicContext.createSequenceIterator(sequence2);
    let childContext = null;
    let sequenceValueIterator = null;
    let done = false;
    return sequenceFactory_default.create({
      next: (hint) => {
        while (!done) {
          if (!childContext) {
            childContext = childContextIterator.next(hint);
            if (childContext.done) {
              done = true;
              return DONE_TOKEN;
            }
          }
          if (!sequenceValueIterator) {
            sequenceValueIterator = this._expression2.evaluateMaybeStatically(
              childContext.value,
              executionParameters
            );
          }
          const value = sequenceValueIterator.value.next(hint);
          if (value.done) {
            sequenceValueIterator = null;
            childContext = null;
            continue;
          }
          return value;
        }
      }
    });
  }
};
var SimpleMapOperator_default = SimpleMapOperator;

// ../gh/fontoxpath/src/expressions/dataTypes/canCastToType.ts
function canCastToType(value, type) {
  const result = tryCastToType(value, type);
  return result.successful;
}

// ../gh/fontoxpath/src/expressions/operators/types/CastableAsOperator.ts
var CastableAsOperator = class extends Expression_default {
  constructor(expression, targetType, allowsEmptySequence) {
    super(expression.specificity, [expression], { canBeStaticallyEvaluated: false });
    this._targetType = stringToValueType(
      targetType.prefix ? `${targetType.prefix}:${targetType.localName}` : targetType.localName
    );
    if (this._targetType === 46 /* XSANYATOMICTYPE */ || this._targetType === 45 /* XSANYSIMPLETYPE */ || this._targetType === 44 /* XSNOTATION */) {
      throw new Error(
        "XPST0080: Casting to xs:anyAtomicType, xs:anySimpleType or xs:NOTATION is not permitted."
      );
    }
    if (targetType.namespaceURI) {
      throw new Error("Not implemented: castable as expressions with a namespace URI.");
    }
    this._expression = expression;
    this._allowsEmptySequence = allowsEmptySequence;
  }
  evaluate(dynamicContext, executionParameters) {
    const evaluatedExpression = atomize(
      this._expression.evaluateMaybeStatically(dynamicContext, executionParameters),
      executionParameters
    );
    return evaluatedExpression.switchCases({
      empty: () => {
        if (!this._allowsEmptySequence) {
          return sequenceFactory_default.singletonFalseSequence();
        }
        return sequenceFactory_default.singletonTrueSequence();
      },
      singleton: () => {
        return evaluatedExpression.map(
          (value) => canCastToType(value, this._targetType) ? trueBoolean : falseBoolean
        );
      },
      multiple: () => {
        return sequenceFactory_default.singletonFalseSequence();
      }
    });
  }
};
var CastableAsOperator_default = CastableAsOperator;

// ../gh/fontoxpath/src/expressions/operators/types/CastAsOperator.ts
var CastAsOperator = class extends Expression_default {
  constructor(expression, targetType, allowsEmptySequence) {
    super(expression.specificity, [expression], { canBeStaticallyEvaluated: false });
    this._targetType = stringToValueType(
      targetType.prefix ? `${targetType.prefix}:${targetType.localName}` : targetType.localName
    );
    if (this._targetType === 46 /* XSANYATOMICTYPE */ || this._targetType === 45 /* XSANYSIMPLETYPE */ || this._targetType === 44 /* XSNOTATION */) {
      throw new Error(
        "XPST0080: Casting to xs:anyAtomicType, xs:anySimpleType or xs:NOTATION is not permitted."
      );
    }
    if (targetType.namespaceURI) {
      throw new Error("Not implemented: casting expressions with a namespace URI.");
    }
    this._expression = expression;
    this._allowsEmptySequence = allowsEmptySequence;
  }
  evaluate(dynamicContext, executionParameters) {
    const evaluatedExpression = atomize(
      this._expression.evaluateMaybeStatically(dynamicContext, executionParameters),
      executionParameters
    );
    return evaluatedExpression.switchCases({
      empty: () => {
        if (!this._allowsEmptySequence) {
          throw new Error(
            "XPTY0004: Sequence to cast is empty while target type is singleton."
          );
        }
        return sequenceFactory_default.empty();
      },
      singleton: () => {
        return evaluatedExpression.map((value) => castToType(value, this._targetType));
      },
      multiple: () => {
        throw new Error("XPTY0004: Sequence to cast is not singleton or empty.");
      }
    });
  }
};
var CastAsOperator_default = CastAsOperator;

// ../gh/fontoxpath/src/expressions/util/sequenceEvery.ts
function sequenceEvery(sequence2, typeTest2) {
  const iterator = sequence2.value;
  let typeTestResultIterator = null;
  let done = false;
  return sequenceFactory_default.create({
    next: (_hint) => {
      while (!done) {
        if (!typeTestResultIterator) {
          const value = iterator.next(0 /* NONE */);
          if (value.done) {
            done = true;
            return ready(trueBoolean);
          }
          typeTestResultIterator = typeTest2(value.value);
        }
        const ebv = typeTestResultIterator.getEffectiveBooleanValue();
        typeTestResultIterator = null;
        if (ebv === false) {
          done = true;
          return ready(falseBoolean);
        }
      }
      return DONE_TOKEN;
    }
  });
}

// ../gh/fontoxpath/src/expressions/operators/types/InstanceOfOperator.ts
var InstanceOfOperator = class extends Expression_default {
  constructor(expression, typeTest2, multiplicity, type) {
    super(
      expression.specificity,
      [expression, typeTest2],
      { canBeStaticallyEvaluated: false },
      false,
      type
    );
    this._expression = expression;
    this._typeTest = typeTest2;
    this._multiplicity = multiplicity;
  }
  evaluate(dynamicContext, executionParameters) {
    const evaluatedExpression = this._expression.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    return evaluatedExpression.switchCases({
      empty: () => {
        if (this._multiplicity === "?" || this._multiplicity === "*") {
          return sequenceFactory_default.singletonTrueSequence();
        }
        return sequenceFactory_default.singletonFalseSequence();
      },
      multiple: () => {
        if (this._multiplicity === "+" || this._multiplicity === "*") {
          return sequenceEvery(evaluatedExpression, (value) => {
            const contextItem = sequenceFactory_default.singleton(value);
            const scopedContext = dynamicContext.scopeWithFocus(0, value, contextItem);
            return this._typeTest.evaluateMaybeStatically(
              scopedContext,
              executionParameters
            );
          });
        }
        return sequenceFactory_default.singletonFalseSequence();
      },
      singleton: () => {
        return sequenceEvery(evaluatedExpression, (value) => {
          const contextItem = sequenceFactory_default.singleton(value);
          const scopedContext = dynamicContext.scopeWithFocus(0, value, contextItem);
          return this._typeTest.evaluateMaybeStatically(
            scopedContext,
            executionParameters
          );
        });
      }
    });
  }
};
var InstanceOfOperator_default = InstanceOfOperator;

// ../gh/fontoxpath/src/expressions/util/sortedSequenceUtils.ts
function isSameNodeValue(a4, b3) {
  if (a4 === null || b3 === null) {
    return false;
  }
  if (!isSubtypeOf(a4.type, 53 /* NODE */) || !isSubtypeOf(b3.type, 53 /* NODE */)) {
    return false;
  }
  return arePointersEqual_default(a4.value, b3.value);
}
function concatSortedSequences(sequences) {
  let currentSequence = sequences.next(0 /* NONE */);
  if (currentSequence.done) {
    return sequenceFactory_default.empty();
  }
  let currentIterator = null;
  let previousValue = null;
  return sequenceFactory_default.create({
    next(hint) {
      if (currentSequence.done) {
        return DONE_TOKEN;
      }
      if (!currentIterator) {
        currentIterator = currentSequence.value.value;
      }
      let value;
      do {
        value = currentIterator.next(hint);
        if (value.done) {
          currentSequence = sequences.next(0 /* NONE */);
          if (currentSequence.done) {
            return value;
          }
          currentIterator = currentSequence.value.value;
        }
      } while (value.done || isSameNodeValue(value.value, previousValue));
      previousValue = value.value;
      return value;
    }
  });
}
function mergeSortedSequences(domFacade2, sequences) {
  const allIterators = [];
  (function loadSequences() {
    let val = sequences.next(0 /* NONE */);
    while (!val.done) {
      const iterator = val.value.value;
      const mappedIterator = {
        current: iterator.next(0 /* NONE */),
        next: (hint) => iterator.next(hint)
      };
      if (!mappedIterator.current.done) {
        allIterators.push(mappedIterator);
      }
      val = sequences.next(0 /* NONE */);
    }
  })();
  let previousNode = null;
  let allSequencesAreSorted = false;
  return sequenceFactory_default.create({
    [Symbol.iterator]() {
      return this;
    },
    next: (_hint) => {
      if (!allSequencesAreSorted) {
        allSequencesAreSorted = true;
        if (allIterators.every(
          (iterator) => isSubtypeOf(iterator.current.value.type, 53 /* NODE */)
        )) {
          allIterators.sort(
            (iteratorA, iteratorB) => compareNodePositions(
              domFacade2,
              iteratorA.current.value,
              iteratorB.current.value
            )
          );
        }
      }
      let consumedValue;
      do {
        if (!allIterators.length) {
          return DONE_TOKEN;
        }
        const consumedIterator = allIterators.shift();
        consumedValue = consumedIterator.current;
        consumedIterator.current = consumedIterator.next(0 /* NONE */);
        if (!isSubtypeOf(consumedValue.value.type, 53 /* NODE */)) {
          return consumedValue;
        }
        if (!consumedIterator.current.done) {
          let low = 0;
          let high = allIterators.length - 1;
          let mid = 0;
          while (low <= high) {
            mid = Math.floor((low + high) / 2);
            const otherNode = allIterators[mid].current.value;
            const comparisonResult = compareNodePositions(
              domFacade2,
              consumedIterator.current.value,
              otherNode
            );
            if (comparisonResult === 0) {
              low = mid;
              break;
            }
            if (comparisonResult > 0) {
              low = mid + 1;
              continue;
            }
            high = mid - 1;
          }
          allIterators.splice(low, 0, consumedIterator);
        }
      } while (isSameNodeValue(consumedValue.value, previousNode));
      previousNode = consumedValue.value;
      return consumedValue;
    }
  });
}

// ../gh/fontoxpath/src/expressions/operators/Union.ts
var Union = class extends Expression_default {
  constructor(expressions, type) {
    const maxSpecificity = expressions.reduce((maxSpecificitySoFar, expression) => {
      if (maxSpecificitySoFar.compareTo(expression.specificity) > 0) {
        return maxSpecificitySoFar;
      }
      return expression.specificity;
    }, new Specificity_default({}));
    super(
      maxSpecificity,
      expressions,
      {
        canBeStaticallyEvaluated: expressions.every(
          (expression) => expression.canBeStaticallyEvaluated
        )
      },
      false,
      type
    );
    this._subExpressions = expressions;
  }
  evaluate(dynamicContext, executionParameters) {
    if (this._subExpressions.every(
      (subExpression) => subExpression.expectedResultOrder === "sorted" /* SORTED */
    )) {
      let i4 = 0;
      return mergeSortedSequences(executionParameters.domFacade, {
        next: (_hint) => {
          if (i4 >= this._subExpressions.length) {
            return DONE_TOKEN;
          }
          return ready(
            this._subExpressions[i4++].evaluateMaybeStatically(
              dynamicContext,
              executionParameters
            )
          );
        }
      }).map((value) => {
        if (!isSubtypeOf(value.type, 53 /* NODE */)) {
          throw new Error("XPTY0004: The sequences to union are not of type node()*");
        }
        return value;
      });
    }
    return concatSequences(
      this._subExpressions.map(
        (expression) => expression.evaluateMaybeStatically(dynamicContext, executionParameters)
      )
    ).mapAll((allValues) => {
      if (allValues.some((nodeValue) => !isSubtypeOf(nodeValue.type, 53 /* NODE */))) {
        throw new Error("XPTY0004: The sequences to union are not of type node()*");
      }
      const sortedValues = sortNodeValues(executionParameters.domFacade, allValues);
      return sequenceFactory_default.create(sortedValues);
    });
  }
};
var Union_default = Union;

// ../gh/fontoxpath/src/expressions/functions/convertItemsToCommonType.ts
function convertItemsToCommonType(items) {
  if (items.every((item) => {
    return item === null || isSubtypeOf(item.type, 5 /* XSINTEGER */) || isSubtypeOf(item.type, 4 /* XSDECIMAL */);
  })) {
    return items;
  }
  const commonTypeName = items.map((item) => item ? getPrimitiveTypeName(item.type) : null).reduce((typeName2, itemType) => {
    if (itemType === null) {
      return typeName2;
    }
    return itemType === typeName2 ? typeName2 : null;
  });
  if (commonTypeName !== null) {
    return items;
  }
  if (items.every((item) => {
    return item === null || isSubtypeOf(item.type, 1 /* XSSTRING */) || isSubtypeOf(item.type, 20 /* XSANYURI */);
  })) {
    return items.map((item) => item ? castToType(item, 1 /* XSSTRING */) : null);
  }
  if (items.every((item) => {
    return item === null || isSubtypeOf(item.type, 4 /* XSDECIMAL */) || isSubtypeOf(item.type, 6 /* XSFLOAT */);
  })) {
    return items.map((item) => item ? castToType(item, 6 /* XSFLOAT */) : item);
  }
  if (items.every((item) => {
    return item === null || isSubtypeOf(item.type, 4 /* XSDECIMAL */) || isSubtypeOf(item.type, 6 /* XSFLOAT */) || isSubtypeOf(item.type, 3 /* XSDOUBLE */);
  })) {
    return items.map((item) => item ? castToType(item, 3 /* XSDOUBLE */) : item);
  }
  return null;
}

// ../gh/fontoxpath/src/expressions/OrderByExpression.ts
function getFirstPrimitiveType(values) {
  const firstActualValue = values.find((value) => !!value);
  if (!firstActualValue) {
    return null;
  }
  return getPrimitiveTypeName(firstActualValue.type);
}
var OrderByExpression = class extends FlworExpression_default {
  constructor(orderSpecs, returnExpression) {
    const specificity = new Specificity_default({});
    super(
      specificity,
      [returnExpression, ...orderSpecs.map((spec) => spec.expression)],
      {
        canBeStaticallyEvaluated: false,
        peer: false,
        resultOrder: "unsorted" /* UNSORTED */,
        subtree: false
      },
      returnExpression
    );
    this._orderSpecs = orderSpecs;
  }
  doFlworExpression(dynamicContext, dynamicContextIterator, executionParameters, createReturnSequence) {
    if (this._orderSpecs[1]) {
      throw new Error("More than one order spec is not supported for the order by clause.");
    }
    const dynamicContexts = [];
    let hasValues = false;
    let values;
    let indices;
    let returnValueIterator = null;
    const orderSpec = this._orderSpecs[0];
    return sequenceFactory_default.create({
      next: () => {
        if (!hasValues) {
          let iteratorResult = dynamicContextIterator.next(0 /* NONE */);
          while (!iteratorResult.done) {
            dynamicContexts.push(iteratorResult.value);
            iteratorResult = dynamicContextIterator.next(0 /* NONE */);
          }
          const evaluatedOrderSpecs = dynamicContexts.map(
            (dynamicContextForEvaluation) => orderSpec.expression.evaluate(
              dynamicContextForEvaluation,
              executionParameters
            )
          );
          const atomizedSequences = evaluatedOrderSpecs.map(
            (evaluatedOrderSpec) => atomize(evaluatedOrderSpec, executionParameters)
          );
          if (atomizedSequences.find((val) => !val.isEmpty() && !val.isSingleton())) {
            throw errXPTY00042("Order by only accepts empty or singleton sequences");
          }
          values = atomizedSequences.map((seq) => seq.first());
          values = values.map((value) => {
            if (value === null) {
              return value;
            }
            if (isSubtypeOf(19 /* XSUNTYPEDATOMIC */, value.type)) {
              return castToType(value, 1 /* XSSTRING */);
            }
            return value;
          });
          const firstPrimitiveType = getFirstPrimitiveType(values);
          if (firstPrimitiveType) {
            values = convertItemsToCommonType(values);
            if (!values) {
              throw errXPTY00042("Could not cast values");
            }
          }
          const numberOfValues = values.length;
          indices = values.map((_value, index) => index);
          for (let startIndex = 0; startIndex < numberOfValues; startIndex++) {
            if (startIndex + 1 === numberOfValues) {
              continue;
            }
            for (let i4 = startIndex; i4 >= 0; i4--) {
              const firstItemIndex = i4;
              const secondItemIndex = i4 + 1;
              if (secondItemIndex === numberOfValues) {
                continue;
              }
              const W2 = values[indices[firstItemIndex]];
              const V2 = values[indices[secondItemIndex]];
              if (V2 === null && W2 === null) {
                continue;
              }
              if (orderSpec.isEmptyLeast) {
                if (W2 === null) {
                  continue;
                }
                if (V2 === null && W2 !== null) {
                  [indices[firstItemIndex], indices[secondItemIndex]] = [
                    indices[secondItemIndex],
                    indices[firstItemIndex]
                  ];
                  continue;
                }
                if (isNaN(V2.value) && W2 !== null && !isNaN(W2.value)) {
                  [indices[firstItemIndex], indices[secondItemIndex]] = [
                    indices[secondItemIndex],
                    indices[firstItemIndex]
                  ];
                  continue;
                }
              } else {
                if (V2 === null) {
                  continue;
                }
                if (W2 === null && V2 !== null) {
                  [indices[firstItemIndex], indices[secondItemIndex]] = [
                    indices[secondItemIndex],
                    indices[firstItemIndex]
                  ];
                  continue;
                }
                if (isNaN(W2.value) && V2 !== null && !isNaN(V2.value)) {
                  [indices[firstItemIndex], indices[secondItemIndex]] = [
                    indices[secondItemIndex],
                    indices[firstItemIndex]
                  ];
                  continue;
                }
              }
              const compareFunction = valueCompare("gtOp", W2.type, V2.type);
              if (compareFunction(W2, V2, dynamicContext)) {
                [indices[firstItemIndex], indices[secondItemIndex]] = [
                  indices[secondItemIndex],
                  indices[firstItemIndex]
                ];
              }
            }
          }
          let currentIndex = orderSpec.isAscending ? 0 : values.length - 1;
          const returnValue = createReturnSequence({
            next: () => {
              if (orderSpec.isAscending) {
                if (currentIndex >= values.length) {
                  return DONE_TOKEN;
                }
                return ready(dynamicContexts[indices[currentIndex++]]);
              } else {
                if (currentIndex < 0) {
                  return DONE_TOKEN;
                }
                return ready(dynamicContexts[indices[currentIndex--]]);
              }
            }
          });
          returnValueIterator = returnValue.value;
          hasValues = true;
        }
        return returnValueIterator.next(0 /* NONE */);
      }
    });
  }
};
var OrderByExpression_default = OrderByExpression;

// ../gh/fontoxpath/src/expressions/path/AbsolutePathExpression.ts
var AbsolutePathExpression = class extends Expression_default {
  constructor(relativePathExpression) {
    super(
      relativePathExpression ? relativePathExpression.specificity : new Specificity_default({}),
      relativePathExpression ? [relativePathExpression] : [],
      {
        resultOrder: "sorted" /* SORTED */,
        subtree: false,
        peer: false,
        canBeStaticallyEvaluated: false
      }
    );
    this._relativePathExpression = relativePathExpression;
  }
  evaluate(dynamicContext, executionParameters) {
    if (dynamicContext.contextItem === null) {
      throw errXPDY0002("context is absent, it needs to be present to use paths.");
    }
    const node = dynamicContext.contextItem.value;
    const domFacade2 = executionParameters.domFacade;
    let documentNode = node;
    while (domFacade2.getNodeType(documentNode) !== 9 /* DOCUMENT_NODE */) {
      documentNode = domFacade2.getParentNodePointer(documentNode);
      if (documentNode === null) {
        throw new Error(
          "XPDY0050: the root node of the context node is not a document node."
        );
      }
    }
    const contextSequence = sequenceFactory_default.singleton(
      createPointerValue(documentNode, domFacade2)
    );
    return this._relativePathExpression ? this._relativePathExpression.evaluateMaybeStatically(
      dynamicContext.scopeWithFocus(0, contextSequence.first(), contextSequence),
      executionParameters
    ) : contextSequence;
  }
};
var AbsolutePathExpression_default = AbsolutePathExpression;

// ../gh/fontoxpath/src/expressions/path/ContextItemExpression.ts
var ContextItemExpression = class extends Expression_default {
  constructor(type) {
    super(
      new Specificity_default({}),
      [],
      {
        resultOrder: "sorted" /* SORTED */
      },
      false,
      type
    );
  }
  evaluate(dynamicContext, _executionParameters) {
    if (dynamicContext.contextItem === null) {
      throw errXPDY0002('context is absent, it needs to be present to use the "." operator');
    }
    return sequenceFactory_default.singleton(dynamicContext.contextItem);
  }
};
var ContextItemExpression_default = ContextItemExpression;

// ../gh/fontoxpath/src/expressions/path/PathExpression.ts
function sortResults(domFacade2, result) {
  let resultContainsNodes = false;
  let resultContainsNonNodes = false;
  result.forEach((resultValue) => {
    if (isSubtypeOf(resultValue.type, 53 /* NODE */)) {
      resultContainsNodes = true;
    } else {
      resultContainsNonNodes = true;
    }
  });
  if (resultContainsNonNodes && resultContainsNodes) {
    throw new Error(
      "XPTY0018: The path operator should either return nodes or non-nodes. Mixed sequences are not allowed."
    );
  }
  if (resultContainsNodes) {
    return sortNodeValues(domFacade2, result);
  }
  return result;
}
var PathExpression = class extends Expression_default {
  constructor(stepExpressions, requireSortedResults) {
    const pathResultsInPeerSequence = stepExpressions.every((selector) => selector.peer);
    const pathResultsInSubtreeSequence = stepExpressions.every((selector) => selector.subtree);
    super(
      stepExpressions.reduce((specificity, selector) => {
        return specificity.add(selector.specificity);
      }, new Specificity_default({})),
      stepExpressions,
      {
        canBeStaticallyEvaluated: false,
        peer: pathResultsInPeerSequence,
        resultOrder: requireSortedResults ? "sorted" /* SORTED */ : "unsorted" /* UNSORTED */,
        subtree: pathResultsInSubtreeSequence
      }
    );
    this._stepExpressions = stepExpressions;
    this._requireSortedResults = requireSortedResults;
  }
  evaluate(dynamicContext, executionParameters) {
    let sequenceHasPeerProperty = true;
    const result = this._stepExpressions.reduce(
      (intermediateResultNodesSequence, selector, index) => {
        const childContextIterator = intermediateResultNodesSequence === null ? (
          // first call, we should use the current dynamic context
          createSingleValueIterator(dynamicContext)
        ) : dynamicContext.createSequenceIterator(intermediateResultNodesSequence);
        let resultValuesInOrderOfEvaluation = {
          next: (hint) => {
            const childContext = childContextIterator.next(hint);
            if (childContext.done) {
              return DONE_TOKEN;
            }
            if (childContext.value.contextItem !== null && !isSubtypeOf(childContext.value.contextItem.type, 53 /* NODE */)) {
              if (index > 0) {
                throw new Error(
                  "XPTY0019: The result of E1 in a path expression E1/E2 should not evaluate to a sequence of nodes."
                );
              }
            }
            return ready(
              selector.evaluateMaybeStatically(
                childContext.value,
                executionParameters
              )
            );
          }
        };
        let sortedResultSequence;
        if (!this._requireSortedResults) {
          sortedResultSequence = concatSortedSequences(resultValuesInOrderOfEvaluation);
        } else {
          switch (selector.expectedResultOrder) {
            case "reverse-sorted" /* REVERSE_SORTED */: {
              const resultValuesInReverseOrder = resultValuesInOrderOfEvaluation;
              resultValuesInOrderOfEvaluation = {
                next: (hint) => {
                  const res = resultValuesInReverseOrder.next(hint);
                  if (res.done) {
                    return res;
                  }
                  return ready(
                    res.value.mapAll(
                      (items) => sequenceFactory_default.create(items.reverse())
                    )
                  );
                }
              };
            }
            case "sorted" /* SORTED */:
              if (selector.subtree && sequenceHasPeerProperty) {
                sortedResultSequence = concatSortedSequences(
                  resultValuesInOrderOfEvaluation
                );
                break;
              }
              sortedResultSequence = mergeSortedSequences(
                executionParameters.domFacade,
                resultValuesInOrderOfEvaluation
              );
              break;
            case "unsorted" /* UNSORTED */: {
              const concattedSequence = concatSortedSequences(
                resultValuesInOrderOfEvaluation
              );
              return concattedSequence.mapAll(
                (allValues) => sequenceFactory_default.create(
                  sortResults(executionParameters.domFacade, allValues)
                )
              );
            }
          }
        }
        sequenceHasPeerProperty = sequenceHasPeerProperty && selector.peer;
        return sortedResultSequence;
      },
      null
    );
    return result;
  }
  getBucket() {
    return this._stepExpressions[0].getBucket();
  }
};
var PathExpression_default = PathExpression;

// ../gh/fontoxpath/src/expressions/postfix/Filter.ts
var Filter = class extends Expression_default {
  constructor(selector, filterExpression) {
    super(
      selector.specificity.add(filterExpression.specificity),
      [selector, filterExpression],
      {
        canBeStaticallyEvaluated: selector.canBeStaticallyEvaluated && filterExpression.canBeStaticallyEvaluated,
        peer: selector.peer,
        resultOrder: selector.expectedResultOrder,
        subtree: selector.subtree
      }
    );
    this._selector = selector;
    this._filterExpression = filterExpression;
  }
  evaluate(dynamicContext, executionParameters) {
    const valuesToFilter = this._selector.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    if (this._filterExpression.canBeStaticallyEvaluated) {
      const result = this._filterExpression.evaluateMaybeStatically(
        dynamicContext,
        executionParameters
      );
      if (result.isEmpty()) {
        return result;
      }
      const resultValue = result.first();
      if (isSubtypeOf(resultValue.type, 2 /* XSNUMERIC */)) {
        let requestedIndex = resultValue.value;
        if (!Number.isInteger(requestedIndex)) {
          return sequenceFactory_default.empty();
        }
        const iterator = valuesToFilter.value;
        let done = false;
        return sequenceFactory_default.create({
          next: (_hint) => {
            if (!done) {
              for (let value = iterator.next(0 /* NONE */); !value.done; value = iterator.next(0 /* NONE */)) {
                if (requestedIndex-- === 1) {
                  done = true;
                  return value;
                }
              }
              done = true;
            }
            return DONE_TOKEN;
          }
        });
      }
      if (result.getEffectiveBooleanValue()) {
        return valuesToFilter;
      }
      return sequenceFactory_default.empty();
    }
    const iteratorToFilter = valuesToFilter.value;
    let iteratorItem = null;
    let i4 = 0;
    let filterResultSequence = null;
    return sequenceFactory_default.create({
      next: (hint) => {
        let isHintApplied = false;
        while (!iteratorItem || !iteratorItem.done) {
          if (!iteratorItem) {
            iteratorItem = iteratorToFilter.next(
              isHintApplied ? 0 /* NONE */ : hint
            );
            isHintApplied = true;
          }
          if (iteratorItem.done) {
            return iteratorItem;
          }
          if (!filterResultSequence) {
            filterResultSequence = this._filterExpression.evaluateMaybeStatically(
              dynamicContext.scopeWithFocus(i4, iteratorItem.value, valuesToFilter),
              executionParameters
            );
          }
          const first = filterResultSequence.first();
          let shouldReturnCurrentValue;
          if (first === null) {
            shouldReturnCurrentValue = false;
          } else if (isSubtypeOf(first.type, 2 /* XSNUMERIC */)) {
            shouldReturnCurrentValue = first.value === i4 + 1;
          } else {
            const ebv = filterResultSequence.getEffectiveBooleanValue();
            shouldReturnCurrentValue = ebv;
          }
          filterResultSequence = null;
          const returnableValue = iteratorItem.value;
          iteratorItem = null;
          i4++;
          if (shouldReturnCurrentValue) {
            return ready(returnableValue);
          }
        }
        return iteratorItem;
      }
    });
  }
  getBucket() {
    return this._selector.getBucket();
  }
};
var Filter_default = Filter;

// ../gh/fontoxpath/src/expressions/postfix/evaluateLookup.ts
function performLookup(contextItem, lookup, previousSequence) {
  const sequences = [previousSequence];
  if (isSubtypeOf(contextItem.type, 62 /* ARRAY */)) {
    const arrayItem = contextItem;
    if (lookup === "*") {
      sequences.push(...arrayItem.members.map((member) => member()));
    } else if (!isSubtypeOf(lookup.type, 5 /* XSINTEGER */)) {
      throw errXPTY00042("The key specifier is not an integer.");
    } else {
      const index = lookup.value;
      if (arrayItem.members.length < index || 0 >= index) {
        throw errFOAY0001();
      }
      sequences.push(arrayItem.members[index - 1]());
    }
  } else if (isSubtypeOf(contextItem.type, 61 /* MAP */)) {
    const mapItem2 = contextItem;
    if (lookup === "*") {
      sequences.push(...mapItem2.keyValuePairs.map((keyValuePair) => keyValuePair.value()));
    } else {
      const matchingPair = mapItem2.keyValuePairs.find(
        (keyValuePair) => isSameMapKey(keyValuePair.key, lookup)
      );
      if (matchingPair) {
        sequences.push(matchingPair.value());
      }
    }
  } else {
    throw errXPTY00042("The provided context item is not a map or an array.");
  }
  return concatSequences(sequences);
}
function evaluateLookup(contextItem, keySpecifier, initialSequence, dynamicContext, executionParameters) {
  if (keySpecifier === "*") {
    return performLookup(contextItem, keySpecifier, initialSequence);
  }
  const lookupSequence = keySpecifier.evaluateMaybeStatically(
    dynamicContext,
    executionParameters
  );
  const createLookupSequence = createDoublyIterableSequence(lookupSequence);
  const deepSequence = createLookupSequence().mapAll(
    (lookups) => lookups.reduce((sequenceToReturn, lookup) => {
      return performLookup(contextItem, lookup, sequenceToReturn);
    }, new EmptySequence())
  );
  return concatSequences([initialSequence, deepSequence]);
}

// ../gh/fontoxpath/src/expressions/postfix/Lookup.ts
var Lookup = class extends Expression_default {
  constructor(selector, keySpecifier) {
    super(selector.specificity, [selector].concat(keySpecifier === "*" ? [] : [keySpecifier]), {
      canBeStaticallyEvaluated: selector.canBeStaticallyEvaluated,
      resultOrder: selector.expectedResultOrder,
      subtree: selector.subtree
    });
    this._selector = selector;
    this._keySpecifier = keySpecifier;
  }
  evaluate(dynamicContext, executionParameters) {
    const sequence2 = this._selector.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    return sequence2.mapAll((items) => {
      return items.reduce((toReturn, item) => {
        return evaluateLookup(
          item,
          this._keySpecifier,
          toReturn,
          dynamicContext,
          executionParameters
        );
      }, new EmptySequence());
    });
  }
  getBucket() {
    return this._selector.getBucket();
  }
};
var Lookup_default = Lookup;

// ../gh/fontoxpath/src/expressions/postfix/UnaryLookup.ts
var UnaryLookup = class extends Expression_default {
  constructor(keySpecifier, type) {
    super(
      new Specificity_default({
        [Specificity_default.EXTERNAL_KIND]: 1
      }),
      keySpecifier === "*" ? [] : [keySpecifier],
      { canBeStaticallyEvaluated: false },
      false,
      type
    );
    this._keySpecifier = keySpecifier;
  }
  evaluate(dynamicContext, executionParameters) {
    return evaluateLookup(
      dynamicContext.contextItem,
      this._keySpecifier,
      new EmptySequence(),
      dynamicContext,
      executionParameters
    );
  }
};
var UnaryLookup_default = UnaryLookup;

// ../gh/fontoxpath/src/expressions/quantified/QuantifiedExpression.ts
var QuantifiedExpression = class extends Expression_default {
  constructor(quantifier, inClauses, satisfiesExpr, type) {
    const inClauseExpressions = inClauses.map((inClause) => inClause.sourceExpr);
    const inClauseNames = inClauses.map((inClause) => inClause.name);
    const specificity = inClauseExpressions.reduce(
      (summedSpecificity, inClause) => summedSpecificity.add(inClause.specificity),
      satisfiesExpr.specificity
    );
    super(
      specificity,
      inClauseExpressions.concat(satisfiesExpr),
      {
        canBeStaticallyEvaluated: false
      },
      false,
      type
    );
    this._quantifier = quantifier;
    this._inClauseNames = inClauseNames;
    this._inClauseExpressions = inClauseExpressions;
    this._satisfiesExpr = satisfiesExpr;
    this._inClauseVariableNames = null;
  }
  evaluate(dynamicContext, executionParameters) {
    let scopingContext = dynamicContext;
    const evaluatedInClauses = this._inClauseVariableNames.map((variableBinding, i4) => {
      const allValuesInInClause = this._inClauseExpressions[i4].evaluateMaybeStatically(scopingContext, executionParameters).getAllValues();
      scopingContext = dynamicContext.scopeWithVariableBindings({
        [variableBinding]: () => sequenceFactory_default.create(allValuesInInClause)
      });
      return allValuesInInClause;
    });
    if (evaluatedInClauses.some((items) => {
      return items.length === 0;
    })) {
      return this._quantifier === "every" ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
    }
    const indices = new Array(evaluatedInClauses.length).fill(0);
    indices[0] = -1;
    let hasOverflowed = true;
    while (hasOverflowed) {
      hasOverflowed = false;
      for (let i4 = 0, l3 = indices.length; i4 < l3; ++i4) {
        const valueArray = evaluatedInClauses[i4];
        if (++indices[i4] > valueArray.length - 1) {
          indices[i4] = 0;
          continue;
        }
        const variables = /* @__PURE__ */ Object.create(null);
        for (let y2 = 0; y2 < indices.length; y2++) {
          const value = evaluatedInClauses[y2][indices[y2]];
          variables[this._inClauseVariableNames[y2]] = () => sequenceFactory_default.singleton(value);
        }
        const context = dynamicContext.scopeWithVariableBindings(variables);
        const result = this._satisfiesExpr.evaluateMaybeStatically(
          context,
          executionParameters
        );
        if (result.getEffectiveBooleanValue() && this._quantifier === "some") {
          return sequenceFactory_default.singletonTrueSequence();
        } else if (!result.getEffectiveBooleanValue() && this._quantifier === "every") {
          return sequenceFactory_default.singletonFalseSequence();
        }
        hasOverflowed = true;
        break;
      }
    }
    return this._quantifier === "every" ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
  }
  performStaticEvaluation(staticContext) {
    this._inClauseVariableNames = [];
    for (let i4 = 0, l3 = this._inClauseNames.length; i4 < l3; ++i4) {
      const expr = this._inClauseExpressions[i4];
      expr.performStaticEvaluation(staticContext);
      staticContext.introduceScope();
      const inClauseName = this._inClauseNames[i4];
      const inClauseNameNamespaceURI = inClauseName.prefix ? staticContext.resolveNamespace(inClauseName.prefix) : null;
      const varBindingName = staticContext.registerVariable(
        inClauseNameNamespaceURI,
        inClauseName.localName
      );
      this._inClauseVariableNames[i4] = varBindingName;
    }
    this._satisfiesExpr.performStaticEvaluation(staticContext);
    for (let i4 = 0, l3 = this._inClauseNames.length; i4 < l3; ++i4) {
      staticContext.removeScope();
    }
  }
};
var QuantifiedExpression_default = QuantifiedExpression;

// ../gh/fontoxpath/src/expressions/tests/KindTest.ts
var KindTest = class extends TestAbstractExpression_default {
  constructor(nodeType) {
    super(
      new Specificity_default({
        [Specificity_default.NODETYPE_KIND]: 1
      })
    );
    this._nodeType = nodeType;
  }
  evaluateToBoolean(_dynamicContext, node, executionParameters) {
    if (!isSubtypeOf(node.type, 53 /* NODE */)) {
      return false;
    }
    const nodeType = executionParameters.domFacade.getNodeType(node.value);
    if (this._nodeType === 3 && nodeType === 4) {
      return true;
    }
    return this._nodeType === nodeType;
  }
  getBucket() {
    return `type-${this._nodeType}`;
  }
};
var KindTest_default = KindTest;

// ../gh/fontoxpath/src/expressions/tests/NameTest.ts
var NameTest = class extends TestAbstractExpression_default {
  constructor(name2, options = { kind: null }) {
    const { prefix: prefix2, namespaceURI, localName } = name2;
    const specificity = {};
    if (localName !== "*") {
      specificity[Specificity_default.NODENAME_KIND] = 1;
    }
    specificity[Specificity_default.NODETYPE_KIND] = 1;
    super(new Specificity_default(specificity));
    this._localName = localName;
    this._namespaceURI = namespaceURI;
    this._prefix = prefix2;
    this._kind = options.kind;
  }
  evaluateToBoolean(_dynamicContext, value, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    const nodeIsElement = isSubtypeOf(value.type, 54 /* ELEMENT */);
    const nodeIsAttribute = isSubtypeOf(value.type, 47 /* ATTRIBUTE */);
    if (!nodeIsElement && !nodeIsAttribute) {
      return false;
    }
    const node = value.value;
    if (this._kind !== null && (this._kind === 1 && !nodeIsElement || this._kind === 2 && !nodeIsAttribute)) {
      return false;
    }
    if (this._prefix === null && this._namespaceURI !== "" && this._localName === "*") {
      return true;
    }
    if (this._prefix === "*") {
      if (this._localName === "*") {
        return true;
      }
      return this._localName === domFacade2.getLocalName(node);
    }
    if (this._localName !== "*") {
      if (this._localName !== domFacade2.getLocalName(node)) {
        return false;
      }
    }
    const resolvedNamespaceURI = this._prefix === "" ? nodeIsElement ? this._namespaceURI : null : this._namespaceURI;
    return (domFacade2.getNamespaceURI(node) || null) === (resolvedNamespaceURI || null);
  }
  getBucket() {
    if (this._localName === "*") {
      if (this._kind === null) {
        return "type-1-or-type-2";
      }
      return `type-${this._kind}`;
    }
    return `name-${this._localName}`;
  }
  performStaticEvaluation(staticContext) {
    if (this._namespaceURI === null && this._prefix !== "*") {
      this._namespaceURI = staticContext.resolveNamespace(this._prefix || "") || null;
      if (!this._namespaceURI && this._prefix) {
        throw new Error(`XPST0081: The prefix ${this._prefix} could not be resolved.`);
      }
    }
  }
};
var NameTest_default = NameTest;

// ../gh/fontoxpath/src/expressions/tests/PITest.ts
var PITest = class extends TestAbstractExpression_default {
  constructor(target) {
    super(
      new Specificity_default({
        [Specificity_default.NODENAME_KIND]: 1
      })
    );
    this._target = target;
  }
  evaluateToBoolean(_dynamicContext, node, executionParameters) {
    const isMatchingProcessingInstruction = isSubtypeOf(node.type, 57 /* PROCESSINGINSTRUCTION */) && executionParameters.domFacade.getTarget(node.value) === this._target;
    return isMatchingProcessingInstruction;
  }
  getBucket() {
    return "type-7";
  }
};
var PITest_default = PITest;

// ../gh/fontoxpath/src/expressions/tests/TypeTest.ts
var TypeTest = class extends TestAbstractExpression_default {
  constructor(type) {
    super(new Specificity_default({}));
    this._type = type;
  }
  evaluateToBoolean(_dynamicContext, item, _executionParameters) {
    return isSubtypeOf(
      item.type,
      stringToValueType(
        this._type.prefix ? this._type.prefix + ":" + this._type.localName : this._type.localName
      )
    );
  }
};
var TypeTest_default = TypeTest;

// ../gh/fontoxpath/src/expressions/VarRef.ts
var VarRef = class extends Expression_default {
  constructor(prefix2, namespaceURI, variableName) {
    super(new Specificity_default({}), [], {
      canBeStaticallyEvaluated: false,
      resultOrder: "unsorted" /* UNSORTED */
    });
    this._variableName = variableName;
    this._namespaceURI = namespaceURI;
    this._prefix = prefix2;
    this._variableBindingName = null;
  }
  evaluate(dynamicContext, executionParameters) {
    const variableBinding = dynamicContext.variableBindings[this._variableBindingName];
    if (!variableBinding) {
      if (this._staticallyBoundVariableValue) {
        return this._staticallyBoundVariableValue(dynamicContext, executionParameters);
      }
      throw new Error(
        "XQDY0054: The variable " + this._variableName + " is declared but not in scope."
      );
    }
    return dynamicContext.variableBindings[this._variableBindingName]();
  }
  performStaticEvaluation(staticContext) {
    if (this._namespaceURI === null && this._prefix) {
      this._namespaceURI = staticContext.resolveNamespace(this._prefix);
    }
    this._variableBindingName = staticContext.lookupVariable(
      this._namespaceURI || "",
      this._variableName
    );
    if (!this._variableBindingName) {
      throw new Error("XPST0008, The variable " + this._variableName + " is not in scope.");
    }
    const staticallyBoundVariableBinding = staticContext.getVariableDeclaration(
      this._variableBindingName
    );
    if (staticallyBoundVariableBinding) {
      this._staticallyBoundVariableValue = staticallyBoundVariableBinding;
    }
  }
};
var VarRef_default = VarRef;

// ../gh/fontoxpath/src/expressions/WhereExpression.ts
var WhereExpression = class extends FlworExpression_default {
  constructor(testExpression, returnExpression) {
    const specificity = new Specificity_default({});
    super(
      specificity,
      [testExpression, returnExpression],
      {
        canBeStaticallyEvaluated: false,
        peer: false,
        resultOrder: "unsorted" /* UNSORTED */,
        subtree: false
      },
      returnExpression
    );
    this._testExpression = testExpression;
  }
  doFlworExpression(_dynamicContext, dynamicContextIterator, executionParameters, createReturnSequence) {
    let currentDynamicContext = null;
    let testExpressionResult = null;
    return createReturnSequence({
      next: () => {
        while (true) {
          if (!testExpressionResult) {
            const currentDynamicContextValue = dynamicContextIterator.next(
              0 /* NONE */
            );
            if (currentDynamicContextValue.done) {
              return DONE_TOKEN;
            }
            currentDynamicContext = currentDynamicContextValue.value;
            testExpressionResult = this._testExpression.evaluateMaybeStatically(
              currentDynamicContext,
              executionParameters
            );
          }
          const effectiveBooleanValue = testExpressionResult.getEffectiveBooleanValue();
          const dynamicContextToReturn = currentDynamicContext;
          currentDynamicContext = null;
          testExpressionResult = null;
          if (!effectiveBooleanValue) {
            continue;
          }
          return ready(dynamicContextToReturn);
        }
      }
    });
  }
};
var WhereExpression_default = WhereExpression;

// ../gh/fontoxpath/src/expressions/xquery-update/IPendingUpdate.ts
var IPendingUpdate = class {
  constructor(pendingUpdateType) {
    this.pendingUpdateType = pendingUpdateType;
    this.type = pendingUpdateType;
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/DeletePendingUpdate.ts
var DeletePendingUpdate = class extends IPendingUpdate {
  constructor(target) {
    super("delete");
    this.target = target;
  }
  toTransferable(executionParameters) {
    return {
      ["type"]: this.type,
      ["target"]: realizeDom(this.target, executionParameters, false)
    };
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/InsertPendingUpdate.ts
var InsertPendingUpdate = class extends IPendingUpdate {
  constructor(target, content, type) {
    super(type);
    this.target = target;
    this.content = content;
  }
  toTransferable(executionParameters) {
    return {
      ["type"]: this.type,
      ["target"]: realizeDom(this.target, executionParameters, false),
      ["content"]: this.content.map(
        (pointer) => realizeDom(pointer, executionParameters, true)
      )
    };
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/InsertAfterPendingUpdate.ts
var InsertAfterPendingUpdate = class extends InsertPendingUpdate {
  constructor(target, content) {
    super(target, content, "insertAfter");
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/InsertAttributesPendingUpdate.ts
var InsertAttributesPendingUpdate = class extends IPendingUpdate {
  constructor(target, content) {
    super("insertAttributes");
    this.target = target;
    this.content = content;
  }
  toTransferable(executionParameters) {
    return {
      ["type"]: this.type,
      ["target"]: realizeDom(this.target, executionParameters, false),
      content: this.content.map((pointer) => realizeDom(pointer, executionParameters, true))
    };
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/InsertBeforePendingUpdate.ts
var InsertBeforePendingUpdate = class extends InsertPendingUpdate {
  constructor(target, content) {
    super(target, content, "insertBefore");
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/InsertIntoAsFirstPendingUpdate.ts
var InsertIntoAsFirstPendingUpdate = class extends InsertPendingUpdate {
  constructor(target, content) {
    super(target, content, "insertIntoAsFirst");
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/InsertIntoAsLastPendingUpdate.ts
var InsertIntoAsLastPendingUpdate = class extends InsertPendingUpdate {
  constructor(target, content) {
    super(target, content, "insertIntoAsLast");
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/InsertIntoPendingUpdate.ts
var InsertIntoPendingUpdate = class extends InsertPendingUpdate {
  constructor(target, content) {
    super(target, content, "insertInto");
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/RenamePendingUpdate.ts
var RenamePendingUpdate = class extends IPendingUpdate {
  constructor(target, newName) {
    super("rename");
    this.target = target;
    this.newName = newName.buildPrefixedName ? newName : new QName_default(newName.prefix, newName.namespaceURI, newName.localName);
  }
  toTransferable(executionParameters) {
    return {
      ["type"]: this.type,
      ["target"]: realizeDom(this.target, executionParameters, false),
      ["newName"]: {
        ["prefix"]: this.newName.prefix,
        ["namespaceURI"]: this.newName.namespaceURI,
        ["localName"]: this.newName.localName
      }
    };
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/ReplaceElementContentPendingUpdate.ts
var ReplaceElementContentPendingUpdate = class extends IPendingUpdate {
  constructor(target, text) {
    super("replaceElementContent");
    this.target = target;
    this.text = text;
  }
  toTransferable(executionParameters) {
    return {
      ["type"]: this.type,
      ["target"]: realizeDom(this.target, executionParameters, false),
      ["text"]: this.text ? realizeDom(this.text, executionParameters, true) : null
    };
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/ReplaceNodePendingUpdate.ts
var ReplaceNodePendingUpdate = class extends IPendingUpdate {
  constructor(target, replacement) {
    super("replaceNode");
    this.target = target;
    this.replacement = replacement;
  }
  toTransferable(executionParameters) {
    return {
      ["type"]: this.type,
      ["target"]: realizeDom(this.target, executionParameters, false),
      ["replacement"]: this.replacement.map(
        (pointer) => realizeDom(pointer, executionParameters, true)
      )
    };
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pendingUpdates/ReplaceValuePendingUpdate.ts
var ReplaceValuePendingUpdate = class extends IPendingUpdate {
  constructor(target, stringValue) {
    super("replaceValue");
    this.target = target;
    this.stringValue = stringValue;
  }
  toTransferable(executionParameters) {
    return {
      ["type"]: this.type,
      ["target"]: realizeDom(this.target, executionParameters, false),
      ["string-value"]: this.stringValue
    };
  }
};

// ../gh/fontoxpath/src/expressions/xquery-update/pulPrimitives.ts
var deletePu2 = (target) => {
  return new DeletePendingUpdate(target);
};
var insertAfter2 = (target, content) => {
  return new InsertAfterPendingUpdate(target, content);
};
var insertBefore2 = (target, content) => {
  return new InsertBeforePendingUpdate(target, content);
};
var insertInto2 = (target, content) => {
  return new InsertIntoPendingUpdate(target, content);
};
var insertIntoAsFirst2 = (target, content) => {
  return new InsertIntoAsFirstPendingUpdate(target, content);
};
var insertIntoAsLast2 = (target, content) => {
  return new InsertIntoAsLastPendingUpdate(target, content);
};
var insertAttributes2 = (target, content) => {
  return new InsertAttributesPendingUpdate(target, content);
};
var rename2 = (target, newName) => {
  return new RenamePendingUpdate(target, newName);
};
var replaceElementContent2 = (target, text) => {
  return new ReplaceElementContentPendingUpdate(target, text);
};
var replaceNode2 = (target, replacement) => {
  return new ReplaceNodePendingUpdate(target, replacement);
};
var replaceValue2 = (target, stringValue) => {
  return new ReplaceValuePendingUpdate(target, stringValue);
};

// ../gh/fontoxpath/src/expressions/xquery-update/DeleteExpression.ts
var DeleteExpression = class extends UpdatingExpression_default {
  constructor(targetExpression) {
    super(new Specificity_default({}), [targetExpression], {
      canBeStaticallyEvaluated: false,
      resultOrder: "unsorted" /* UNSORTED */
    });
    this._targetExpression = targetExpression;
  }
  evaluateWithUpdateList(dynamicContext, executionParameters) {
    const targetValueIterator = this.ensureUpdateListWrapper(this._targetExpression)(
      dynamicContext,
      executionParameters
    );
    const domFacade2 = executionParameters.domFacade;
    let tlist;
    let tlistUpdates;
    return {
      next: () => {
        if (!tlist) {
          const tv = targetValueIterator.next(0 /* NONE */);
          if (tv.value.xdmValue.some((entry) => !isSubtypeOf(entry.type, 53 /* NODE */))) {
            throw errXUTY0007();
          }
          tlist = tv.value.xdmValue;
          tlistUpdates = tv.value.pendingUpdateList;
        }
        tlist = tlist.filter((node) => domFacade2.getParentNodePointer(node.value));
        return ready({
          pendingUpdateList: mergeUpdates(
            tlist.map((node) => deletePu2(node.value)),
            tlistUpdates
          ),
          xdmValue: []
        });
      }
    };
  }
};
var DeleteExpression_default = DeleteExpression;

// ../gh/fontoxpath/src/expressions/xquery/ElementConstructorContent.ts
function createTinyTextNode(content) {
  const tinyTextNode = {
    data: content,
    isTinyNode: true,
    nodeType: 3 /* TEXT_NODE */
  };
  return tinyTextNode;
}
function parseChildNodes(childNodes, executionParameters, attributes, contentNodes, attributesDone, attributeError) {
  const domFacade2 = executionParameters.domFacade;
  childNodes.reduce(function flattenArray(convertedChildNodes, childNode) {
    if (isSubtypeOf(childNode.type, 62 /* ARRAY */)) {
      const arrayValue = childNode;
      arrayValue.members.forEach(
        (member) => member().getAllValues().forEach((item) => flattenArray(convertedChildNodes, item))
      );
      return convertedChildNodes;
    }
    convertedChildNodes.push(childNode);
    return convertedChildNodes;
  }, []).forEach((childNode, i4, atomizedChildNodes) => {
    if (isSubtypeOf(childNode.type, 47 /* ATTRIBUTE */)) {
      if (attributesDone) {
        throw attributeError(childNode.value, domFacade2);
      }
      const attrNode = childNode.value;
      attributes.push(attrNode.node);
      return;
    }
    if (isSubtypeOf(childNode.type, 46 /* XSANYATOMICTYPE */) || isSubtypeOf(childNode.type, 53 /* NODE */) && domFacade2.getNodeType(childNode.value) === 3 /* TEXT_NODE */) {
      const atomizedValue = isSubtypeOf(childNode.type, 46 /* XSANYATOMICTYPE */) ? castToType(
        atomizeSingleValue(childNode, executionParameters).first(),
        1 /* XSSTRING */
      ).value : domFacade2.getDataFromPointer(childNode.value);
      if (i4 !== 0 && isSubtypeOf(atomizedChildNodes[i4 - 1].type, 46 /* XSANYATOMICTYPE */) && isSubtypeOf(childNode.type, 46 /* XSANYATOMICTYPE */)) {
        contentNodes.push(createTinyTextNode(" " + atomizedValue));
        attributesDone = true;
        return;
      }
      if (atomizedValue) {
        contentNodes.push(createTinyTextNode("" + atomizedValue));
        attributesDone = true;
      }
      return;
    }
    if (isSubtypeOf(childNode.type, 55 /* DOCUMENTNODE */)) {
      const docChildNodes = [];
      domFacade2.getChildNodePointers(childNode.value).forEach((node) => docChildNodes.push(createPointerValue(node, domFacade2)));
      attributesDone = parseChildNodes(
        docChildNodes,
        executionParameters,
        attributes,
        contentNodes,
        attributesDone,
        attributeError
      );
      return;
    }
    if (isSubtypeOf(childNode.type, 53 /* NODE */)) {
      contentNodes.push(childNode.value.node);
      attributesDone = true;
      return;
    }
    if (isSubtypeOf(childNode.type, 60 /* FUNCTION */)) {
      throw errFOTY0013(childNode.type);
    }
    throw new Error(`Atomizing ${childNode.type} is not implemented.`);
  });
  return attributesDone;
}
function parseContent(allChildNodes, executionParameters, attributeError) {
  const attributes = [];
  const contentNodes = [];
  let attributesDone = false;
  allChildNodes.forEach((childNodes) => {
    attributesDone = parseChildNodes(
      childNodes,
      executionParameters,
      attributes,
      contentNodes,
      attributesDone,
      attributeError
    );
  });
  return { attributes, contentNodes };
}

// ../gh/fontoxpath/src/expressions/xquery-update/InsertExpression.ts
var ELEMENT_NODE = 1;
function testNamespaceURIForAttribute(targetElement, attributeNode, namespaceBindings, domFacade2) {
  const prefix2 = domFacade2.getPrefix(attributeNode) || "";
  const namespaceURI = domFacade2.getNamespaceURI(attributeNode);
  const boundNamespaceURI = prefix2 ? targetElement.node.lookupNamespaceURI(prefix2) : null;
  if (boundNamespaceURI && boundNamespaceURI !== namespaceURI) {
    throw errXUDY0023(namespaceURI);
  }
  const alreadyDeclaredNamespace = namespaceBindings[prefix2];
  if (alreadyDeclaredNamespace) {
    if (namespaceURI !== alreadyDeclaredNamespace) {
      throw errXUDY0024(namespaceURI);
    }
  }
}
function buildPendingUpdates(targetChoice, target, parent, alist, clist) {
  const updates = [];
  switch (targetChoice) {
    // a. If as first into is specified, the pending update list includes the following update primitives:
    case 4 /* INSERT_INTO_AS_FIRST */:
      if (alist.length) {
        updates.push(insertAttributes2(target, alist));
      }
      if (clist.length) {
        updates.push(insertIntoAsFirst2(target, clist));
      }
      break;
    // b. If as last into is specified, the pending update list includes the following update primitives:
    case 5 /* INSERT_INTO_AS_LAST */:
      if (alist.length) {
        updates.push(insertAttributes2(target, alist));
      }
      if (clist.length) {
        updates.push(insertIntoAsLast2(target, clist));
      }
      break;
    // c. If into is specified with neither as first nor as last, the pending update list includes the following update primitives:
    case 3 /* INSERT_INTO */:
      if (alist.length) {
        updates.push(insertAttributes2(target, alist));
      }
      if (clist.length) {
        updates.push(insertInto2(target, clist));
      }
      break;
    // d. If before is specified, let $parent be the parent node of $target. The pending update list includes the following update primitives:
    case 2 /* INSERT_BEFORE */:
      if (alist.length) {
        updates.push(insertAttributes2(parent, alist));
      }
      if (clist.length) {
        updates.push(insertBefore2(target, clist));
      }
      break;
    // e. If after is specified, let $parent be the parent node of $target. The pending update list includes the following update primitives:
    case 1 /* INSERT_AFTER */:
      if (alist.length) {
        updates.push(insertAttributes2(parent, alist));
      }
      if (clist.length) {
        updates.push(insertAfter2(target, clist));
      }
      break;
  }
  return updates;
}
var InsertExpression = class extends UpdatingExpression_default {
  constructor(sourceExpression, targetChoice, targetExpression) {
    super(new Specificity_default({}), [sourceExpression, targetExpression], {
      canBeStaticallyEvaluated: false,
      resultOrder: "unsorted" /* UNSORTED */
    });
    this._sourceExpression = sourceExpression;
    this._targetChoice = targetChoice;
    this._targetExpression = targetExpression;
  }
  evaluateWithUpdateList(dynamicContext, executionParameters) {
    const sourceValueIterator = this.ensureUpdateListWrapper(this._sourceExpression)(
      dynamicContext,
      executionParameters
    );
    const targetValueIterator = this.ensureUpdateListWrapper(this._targetExpression)(
      dynamicContext,
      executionParameters
    );
    const domFacade2 = executionParameters.domFacade;
    let alist;
    let clist;
    let sourceUpdates;
    let target;
    let targetUpdates;
    let parent;
    return {
      next: () => {
        if (!alist) {
          const sv = sourceValueIterator.next(0 /* NONE */);
          const allChildNodes = [sv.value.xdmValue];
          const insertionSequence = parseContent(
            allChildNodes,
            executionParameters,
            errXUTY0004
          );
          alist = insertionSequence.attributes.map((attr) => {
            return { node: attr, graftAncestor: null };
          });
          clist = insertionSequence.contentNodes.map((contentNode) => {
            return { node: contentNode, graftAncestor: null };
          });
          sourceUpdates = sv.value.pendingUpdateList;
        }
        if (!target) {
          const tv = targetValueIterator.next(0 /* NONE */);
          if (tv.value.xdmValue.length === 0) {
            throw errXUDY0027();
          }
          if (this._targetChoice >= 3 /* INSERT_INTO */) {
            if (tv.value.xdmValue.length !== 1) {
              throw errXUTY0005();
            }
            if (!isSubtypeOf(tv.value.xdmValue[0].type, 54 /* ELEMENT */) && !isSubtypeOf(tv.value.xdmValue[0].type, 55 /* DOCUMENTNODE */)) {
              throw errXUTY0005();
            }
          } else {
            if (tv.value.xdmValue.length !== 1) {
              throw errXUTY0006();
            }
            if (!isSubtypeOf(tv.value.xdmValue[0].type, 54 /* ELEMENT */) && !isSubtypeOf(tv.value.xdmValue[0].type, 56 /* TEXT */) && !isSubtypeOf(tv.value.xdmValue[0].type, 58 /* COMMENT */) && !isSubtypeOf(tv.value.xdmValue[0].type, 57 /* PROCESSINGINSTRUCTION */)) {
              throw errXUTY0006();
            }
            parent = domFacade2.getParentNodePointer(
              tv.value.xdmValue[0].value,
              null
            );
            if (parent === null) {
              throw errXUDY0029(tv.value.xdmValue[0].value);
            }
          }
          target = tv.value.xdmValue[0];
          targetUpdates = tv.value.pendingUpdateList;
        }
        if (alist.length) {
          if (this._targetChoice >= 3 /* INSERT_INTO */) {
            if (!isSubtypeOf(target.type, 54 /* ELEMENT */)) {
              throw errXUTY0022();
            }
          } else {
            if (domFacade2.getNodeType(parent) !== ELEMENT_NODE) {
              throw errXUDY0030();
            }
          }
          alist.reduce(
            (namespaceBindings, attributeNode) => {
              const prefix2 = domFacade2.getPrefix(attributeNode) || "";
              testNamespaceURIForAttribute(
                target.value,
                attributeNode,
                namespaceBindings,
                domFacade2
              );
              namespaceBindings[prefix2] = domFacade2.getNamespaceURI(
                attributeNode
              );
              return namespaceBindings;
            },
            {}
          );
        }
        return ready({
          xdmValue: [],
          pendingUpdateList: mergeUpdates(
            buildPendingUpdates(
              this._targetChoice,
              target.value,
              parent ? parent : null,
              alist,
              clist
            ),
            sourceUpdates,
            targetUpdates
          )
        });
      }
    };
  }
};
var InsertExpression_default = InsertExpression;

// ../gh/fontoxpath/src/expressions/xquery/nameExpression.ts
var nameExprErr = () => errXPTY0004(
  "Casting not supported from given type to a single xs:string or xs:untypedAtomic or any of its derived types."
);
var NC_NAME_START_CHAR = /([A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])/;
var NC_NAME_CHAR = new RegExp(
  `(${NC_NAME_START_CHAR.source}|[-.0-9\xB7\u0300-\u036F\u203F\u2040])`
);
var NC_NAME = new RegExp(`${NC_NAME_START_CHAR.source}${NC_NAME_CHAR.source}*`, "g");
var isValidNCName2 = (name2) => {
  const matches = name2.match(NC_NAME);
  return matches ? matches.length === 1 : false;
};
function evaluateNCNameExpression(executionParameters, nameSequence) {
  const name2 = atomize(nameSequence, executionParameters);
  return name2.switchCases({
    singleton: (seq) => {
      const nameValue = seq.first();
      if (isSubtypeOf(nameValue.type, 1 /* XSSTRING */) || isSubtypeOf(nameValue.type, 19 /* XSUNTYPEDATOMIC */)) {
        if (!isValidNCName2(nameValue.value)) {
          throw errXQDY0041(nameValue.value);
        }
        return sequenceFactory_default.singleton(nameValue);
      }
      throw nameExprErr();
    },
    default: () => {
      throw nameExprErr();
    }
  }).value;
}
function evaluateQNameExpression(staticContext, executionParameters, nameSequence) {
  const name2 = atomize(nameSequence, executionParameters);
  return name2.switchCases({
    singleton: (seq) => {
      const nameValue = seq.first();
      if (isSubtypeOf(nameValue.type, 23 /* XSQNAME */)) {
        return sequenceFactory_default.singleton(nameValue);
      } else if (isSubtypeOf(nameValue.type, 1 /* XSSTRING */) || isSubtypeOf(nameValue.type, 19 /* XSUNTYPEDATOMIC */)) {
        let prefix2;
        let namespaceURI;
        let localName;
        const parts = nameValue.value.split(":");
        if (parts.length === 1) {
          localName = parts[0];
        } else {
          prefix2 = parts[0];
          namespaceURI = staticContext.resolveNamespace(prefix2);
          localName = parts[1];
        }
        if (!isValidNCName2(localName) || prefix2 && !isValidNCName2(prefix2)) {
          throw errXQDY0074(prefix2 ? `${prefix2}:${localName}` : localName);
        }
        if (prefix2 && !namespaceURI) {
          throw errXQDY0074(`${prefix2}:${localName}`);
        }
        return sequenceFactory_default.singleton({
          type: 23 /* XSQNAME */,
          value: new QName_default(prefix2, namespaceURI, localName)
        });
      }
      throw nameExprErr();
    },
    default: () => {
      throw nameExprErr();
    }
  }).value;
}

// ../gh/fontoxpath/src/expressions/xquery-update/RenameExpression.ts
function evaluateTarget(targetXdmValue) {
  if (targetXdmValue.length === 0) {
    throw errXUDY0027();
  }
  if (targetXdmValue.length !== 1) {
    throw errXUTY0012();
  }
  if (!isSubtypeOf(targetXdmValue[0].type, 54 /* ELEMENT */) && !isSubtypeOf(targetXdmValue[0].type, 47 /* ATTRIBUTE */) && !isSubtypeOf(targetXdmValue[0].type, 57 /* PROCESSINGINSTRUCTION */)) {
    throw errXUTY0012();
  }
  return targetXdmValue[0];
}
function evaluateNewName(staticContext, executionParameters, newNameXdmValue, target) {
  const nameSequence = sequenceFactory_default.create(newNameXdmValue);
  switch (target.type) {
    case 54 /* ELEMENT */: {
      const qName2 = evaluateQNameExpression(
        staticContext,
        executionParameters,
        nameSequence
      ).next(0 /* NONE */).value.value;
      const boundNamespaceURI = target.value.node.lookupNamespaceURI(qName2.prefix);
      if (boundNamespaceURI && boundNamespaceURI !== qName2.namespaceURI) {
        throw errXUDY0023(qName2.namespaceURI);
      }
      return qName2;
    }
    case 47 /* ATTRIBUTE */: {
      const qName2 = evaluateQNameExpression(
        staticContext,
        executionParameters,
        nameSequence
      ).next(0 /* NONE */).value.value;
      if (qName2.namespaceURI) {
        const boundNamespaceURI = target.value.node.lookupNamespaceURI(qName2.prefix);
        if (boundNamespaceURI && boundNamespaceURI !== qName2.namespaceURI) {
          throw errXUDY0023(qName2.namespaceURI);
        }
      }
      return qName2;
    }
    case 57 /* PROCESSINGINSTRUCTION */: {
      const nCName = evaluateNCNameExpression(executionParameters, nameSequence).next(
        0 /* NONE */
      ).value.value;
      return new QName_default("", null, nCName);
    }
  }
}
var RenameExpression = class extends UpdatingExpression_default {
  constructor(targetExpression, newNameExpression) {
    super(new Specificity_default({}), [targetExpression, newNameExpression], {
      canBeStaticallyEvaluated: false,
      resultOrder: "unsorted" /* UNSORTED */
    });
    this._targetExpression = targetExpression;
    this._newNameExpression = newNameExpression;
    this._staticContext = void 0;
  }
  evaluateWithUpdateList(dynamicContext, executionParameters) {
    const targetValueIterator = this.ensureUpdateListWrapper(this._targetExpression)(
      dynamicContext,
      executionParameters
    );
    const newNameValueIterator = this.ensureUpdateListWrapper(this._newNameExpression)(
      dynamicContext,
      executionParameters
    );
    return {
      next: () => {
        const tv = targetValueIterator.next(0 /* NONE */);
        const target = evaluateTarget(tv.value.xdmValue);
        const nnv = newNameValueIterator.next(0 /* NONE */);
        const qName2 = evaluateNewName(
          this._staticContext,
          executionParameters,
          nnv.value.xdmValue,
          target
        );
        return ready({
          xdmValue: [],
          pendingUpdateList: mergeUpdates(
            [rename2(target.value, qName2)],
            tv.value.pendingUpdateList,
            nnv.value.pendingUpdateList
          )
        });
      }
    };
  }
  performStaticEvaluation(staticContext) {
    this._staticContext = staticContext.cloneContext();
    super.performStaticEvaluation(staticContext);
  }
};
var RenameExpression_default = RenameExpression;

// ../gh/fontoxpath/src/expressions/xquery-update/ReplaceExpression.ts
function evaluateReplaceNode(executionParameters, targetValueIterator, replacementValueIterator) {
  const domFacade2 = executionParameters.domFacade;
  let rlist;
  let rlistUpdates;
  let parent;
  return {
    next: () => {
      if (!rlist) {
        const rl = replacementValueIterator.next(0 /* NONE */);
        const allChildNodes = [rl.value.xdmValue];
        const parsedContent = parseContent(allChildNodes, executionParameters, errXUDY0024);
        rlist = {
          attributes: parsedContent.attributes.map((attr) => {
            return { node: attr, graftAncestor: null };
          }),
          contentNodes: parsedContent.contentNodes.map((contentNode) => {
            return { node: contentNode, graftAncestor: null };
          })
        };
        rlistUpdates = rl.value.pendingUpdateList;
      }
      const tv = targetValueIterator.next(0 /* NONE */);
      if (tv.value.xdmValue.length === 0) {
        throw errXUDY0027();
      }
      if (tv.value.xdmValue.length !== 1) {
        throw errXUTY0008();
      }
      if (!isSubtypeOf(tv.value.xdmValue[0].type, 54 /* ELEMENT */) && !isSubtypeOf(tv.value.xdmValue[0].type, 47 /* ATTRIBUTE */) && !isSubtypeOf(tv.value.xdmValue[0].type, 56 /* TEXT */) && !isSubtypeOf(tv.value.xdmValue[0].type, 58 /* COMMENT */) && !isSubtypeOf(tv.value.xdmValue[0].type, 57 /* PROCESSINGINSTRUCTION */)) {
        throw errXUTY0008();
      }
      parent = executionParameters.domFacade.getParentNodePointer(
        tv.value.xdmValue[0].value,
        null
      );
      if (parent === null) {
        throw errXUDY0009(tv.value.xdmValue[0].value);
      }
      const target = tv.value.xdmValue[0];
      const targetUpdates = tv.value.pendingUpdateList;
      if (!isSubtypeOf(target.type, 47 /* ATTRIBUTE */)) {
        if (rlist.attributes.length) {
          throw errXUTY0010();
        }
      } else {
        if (rlist.contentNodes.length) {
          throw errXUTY0011();
        }
        rlist.attributes.reduce(
          (namespaceBindings, attributePointer) => {
            const prefix2 = domFacade2.getPrefix(attributePointer) || "";
            const namespaceURI = domFacade2.getNamespaceURI(attributePointer);
            const boundNamespaceURI = parent.node.lookupNamespaceURI(prefix2);
            if (boundNamespaceURI && boundNamespaceURI !== namespaceURI) {
              throw errXUDY0023(namespaceURI);
            }
            const alreadyDeclaredNamespace = namespaceBindings[prefix2];
            if (alreadyDeclaredNamespace) {
              if (namespaceURI !== alreadyDeclaredNamespace) {
                throw errXUDY0024(namespaceURI);
              }
            }
            namespaceBindings[prefix2] = namespaceURI;
            return namespaceBindings;
          },
          {}
        );
      }
      return ready({
        xdmValue: [],
        pendingUpdateList: mergeUpdates(
          [replaceNode2(target.value, [].concat(rlist.attributes, rlist.contentNodes))],
          rlistUpdates,
          targetUpdates
        )
      });
    }
  };
}
function evaluateReplaceNodeValue(executionParameters, targetValueIterator, replacementValueIterator) {
  let target;
  let targetUpdates;
  let text;
  let rlistUpdates;
  let done = false;
  return {
    next: () => {
      if (done) {
        return DONE_TOKEN;
      }
      if (!text) {
        const rl = replacementValueIterator.next(0 /* NONE */);
        const atomized = atomize(
          sequenceFactory_default.create(rl.value.xdmValue),
          executionParameters
        ).map((value) => castToType(value, 1 /* XSSTRING */));
        const textContent = atomized.getAllValues().map((value) => value.value).join(" ");
        text = textContent.length === 0 ? null : {
          node: executionParameters.nodesFactory.createTextNode(textContent),
          graftAncestor: null
        };
        rlistUpdates = rl.value.pendingUpdateList;
      }
      if (!target) {
        const tv = targetValueIterator.next(0 /* NONE */);
        if (tv.value.xdmValue.length === 0) {
          throw errXUDY0027();
        }
        if (tv.value.xdmValue.length !== 1) {
          throw errXUTY0008();
        }
        if (!isSubtypeOf(tv.value.xdmValue[0].type, 54 /* ELEMENT */) && !isSubtypeOf(tv.value.xdmValue[0].type, 47 /* ATTRIBUTE */) && !isSubtypeOf(tv.value.xdmValue[0].type, 56 /* TEXT */) && !isSubtypeOf(tv.value.xdmValue[0].type, 58 /* COMMENT */) && !isSubtypeOf(tv.value.xdmValue[0].type, 57 /* PROCESSINGINSTRUCTION */)) {
          throw errXUTY0008();
        }
        target = tv.value.xdmValue[0];
        targetUpdates = tv.value.pendingUpdateList;
      }
      if (isSubtypeOf(target.type, 54 /* ELEMENT */)) {
        done = true;
        return ready({
          xdmValue: [],
          pendingUpdateList: mergeUpdates(
            [replaceElementContent2(target.value, text)],
            rlistUpdates,
            targetUpdates
          )
        });
      }
      if (isSubtypeOf(target.type, 47 /* ATTRIBUTE */) || isSubtypeOf(target.type, 56 /* TEXT */) || isSubtypeOf(target.type, 58 /* COMMENT */) || isSubtypeOf(target.type, 57 /* PROCESSINGINSTRUCTION */)) {
        const stringValue = text ? executionParameters.domFacade.getDataFromPointer(text) : "";
        if (isSubtypeOf(target.type, 58 /* COMMENT */) && (stringValue.includes("--") || stringValue.endsWith("-"))) {
          throw errXQDY0072(stringValue);
        }
        if (isSubtypeOf(target.type, 57 /* PROCESSINGINSTRUCTION */) && stringValue.includes("?>")) {
          throw errXQDY0026(stringValue);
        }
        done = true;
        return ready({
          xdmValue: [],
          pendingUpdateList: mergeUpdates(
            [replaceValue2(target.value, stringValue)],
            rlistUpdates,
            targetUpdates
          )
        });
      }
    }
  };
}
var ReplaceExpression = class extends UpdatingExpression_default {
  constructor(valueOf, targetExpression, replacementExpression) {
    super(new Specificity_default({}), [targetExpression, replacementExpression], {
      canBeStaticallyEvaluated: false,
      resultOrder: "unsorted" /* UNSORTED */
    });
    this._valueOf = valueOf;
    this._targetExpression = targetExpression;
    this._replacementExpression = replacementExpression;
  }
  evaluateWithUpdateList(dynamicContext, executionParameters) {
    const targetValueIterator = this.ensureUpdateListWrapper(this._targetExpression)(
      dynamicContext,
      executionParameters
    );
    const replacementValueIterator = this.ensureUpdateListWrapper(this._replacementExpression)(
      dynamicContext,
      executionParameters
    );
    return this._valueOf ? evaluateReplaceNodeValue(
      executionParameters,
      targetValueIterator,
      replacementValueIterator
    ) : evaluateReplaceNode(
      executionParameters,
      targetValueIterator,
      replacementValueIterator
    );
  }
};
var ReplaceExpression_default = ReplaceExpression;

// ../gh/fontoxpath/src/expressions/xquery-update/createPendingUpdateFromTransferable.ts
function createPendingUpdateFromTransferable(transferable) {
  switch (transferable["type"]) {
    case "delete":
      return new DeletePendingUpdate({
        node: transferable["target"],
        graftAncestor: null
      });
    case "insertAfter":
      return new InsertAfterPendingUpdate(
        {
          node: transferable["target"],
          graftAncestor: null
        },
        transferable["content"].map((contentNode) => {
          return { node: contentNode, graftAncestor: null };
        })
      );
    case "insertBefore":
      return new InsertBeforePendingUpdate(
        { node: transferable["target"], graftAncestor: null },
        transferable["content"].map((contentNode) => {
          return { node: contentNode, graftAncestor: null };
        })
      );
    case "insertInto":
      return new InsertIntoPendingUpdate(
        { node: transferable["target"], graftAncestor: null },
        transferable["content"].map((contentNode) => {
          return { node: contentNode, graftAncestor: null };
        })
      );
    case "insertIntoAsFirst":
      return new InsertIntoAsFirstPendingUpdate(
        { node: transferable["target"], graftAncestor: null },
        transferable["content"].map((contentNode) => {
          return { node: contentNode, graftAncestor: null };
        })
      );
    case "insertIntoAsLast":
      return new InsertIntoAsLastPendingUpdate(
        { node: transferable["target"], graftAncestor: null },
        transferable["content"].map((contentNode) => {
          return { node: contentNode, graftAncestor: null };
        })
      );
    case "insertAttributes":
      return new InsertAttributesPendingUpdate(
        { node: transferable["target"], graftAncestor: null },
        transferable["content"].map((contentNode) => {
          return { node: contentNode, graftAncestor: null };
        })
      );
    case "rename":
      return new RenamePendingUpdate(
        { node: transferable["target"], graftAncestor: null },
        transferable["newName"]
      );
    case "replaceNode":
      return new ReplaceNodePendingUpdate(
        {
          node: transferable["target"],
          graftAncestor: null
        },
        transferable["replacement"].map((contentNode) => {
          return { node: contentNode, graftAncestor: null };
        })
      );
    case "replaceValue":
      return new ReplaceValuePendingUpdate(
        {
          node: transferable["target"],
          graftAncestor: null
        },
        transferable["string-value"]
      );
    case "replaceElementContent":
      return new ReplaceElementContentPendingUpdate(
        { node: transferable["target"], graftAncestor: null },
        transferable["text"] ? { node: transferable["text"], graftAncestor: null } : null
      );
    default:
      throw new Error(
        `Unexpected type "${transferable["type"]}" when parsing a transferable pending update.`
      );
  }
}

// ../gh/fontoxpath/src/expressions/xquery-update/TransformExpression.ts
function isCreatedNode(node, createdNodes, domFacade2) {
  if (createdNodes.find((cNode) => arePointersEqual_default(cNode, node))) {
    return true;
  }
  const parent = domFacade2.getParentNodePointer(node);
  return parent ? isCreatedNode(parent, createdNodes, domFacade2) : false;
}
var TransformExpression = class extends UpdatingExpression_default {
  constructor(variableBindings, modifyExpr, returnExpr) {
    super(
      new Specificity_default({}),
      variableBindings.reduce(
        (childExpressions, variableBinding) => {
          childExpressions.push(variableBinding.sourceExpr);
          return childExpressions;
        },
        [modifyExpr, returnExpr]
      ),
      {
        canBeStaticallyEvaluated: false,
        resultOrder: "unsorted" /* UNSORTED */
      }
    );
    this._variableBindings = variableBindings;
    this._modifyExpr = modifyExpr;
    this._returnExpr = returnExpr;
    this.isUpdating = null;
  }
  evaluate(dynamicContext, executionParameters) {
    const pendingUpdateIterator = this.evaluateWithUpdateList(
      dynamicContext,
      executionParameters
    );
    return separateXDMValueFromUpdatingExpressionResult(pendingUpdateIterator, (_pul) => {
    });
  }
  evaluateWithUpdateList(dynamicContext, executionParameters) {
    const { domFacade: domFacade2, nodesFactory, documentWriter } = executionParameters;
    const sourceValueIterators = [];
    let modifyValueIterator;
    let returnValueIterator;
    let modifyPul;
    const createdNodes = [];
    const toMergePuls = [];
    return {
      next: () => {
        if (createdNodes.length !== this._variableBindings.length) {
          for (let i4 = createdNodes.length; i4 < this._variableBindings.length; i4++) {
            const variableBinding = this._variableBindings[i4];
            let sourceValueIterator = sourceValueIterators[i4];
            if (!sourceValueIterator) {
              sourceValueIterators[i4] = sourceValueIterator = this.ensureUpdateListWrapper(variableBinding.sourceExpr)(
                dynamicContext,
                executionParameters
              );
            }
            const sv = sourceValueIterator.next(0 /* NONE */);
            if (sv.value.xdmValue.length !== 1 || !isSubtypeOf(sv.value.xdmValue[0].type, 53 /* NODE */)) {
              throw errXUTY0013();
            }
            const node = sv.value.xdmValue[0];
            const copiedNodes = createPointerValue(
              deepCloneNode(node.value, executionParameters),
              domFacade2
            );
            createdNodes.push(copiedNodes.value);
            toMergePuls.push(sv.value.pendingUpdateList);
            dynamicContext = dynamicContext.scopeWithVariableBindings({
              [variableBinding.registeredVariable]: () => sequenceFactory_default.singleton(copiedNodes)
            });
          }
        }
        if (!modifyPul) {
          if (!modifyValueIterator) {
            modifyValueIterator = this.ensureUpdateListWrapper(this._modifyExpr)(
              dynamicContext,
              executionParameters
            );
          }
          const mv = modifyValueIterator.next(0 /* NONE */);
          modifyPul = mv.value.pendingUpdateList;
        }
        modifyPul.forEach((pu) => {
          if (pu.target && !isCreatedNode(pu.target, createdNodes, domFacade2)) {
            throw errXUDY0014(pu.target.node);
          }
          if (pu.type === "put") {
            throw errXUDY0037();
          }
        });
        const pul = modifyPul.map((update) => {
          const transferable = update.toTransferable(executionParameters);
          return createPendingUpdateFromTransferable(transferable);
        });
        applyUpdates(pul, null, null, domFacade2, nodesFactory, documentWriter);
        if (!returnValueIterator) {
          returnValueIterator = this.ensureUpdateListWrapper(this._returnExpr)(
            dynamicContext,
            executionParameters
          );
        }
        const rv = returnValueIterator.next(0 /* NONE */);
        return ready({
          xdmValue: rv.value.xdmValue,
          pendingUpdateList: mergeUpdates(rv.value.pendingUpdateList, ...toMergePuls)
        });
      }
    };
  }
  performStaticEvaluation(staticContext) {
    staticContext.introduceScope();
    this._variableBindings.forEach(
      (variableBinding) => variableBinding.registeredVariable = staticContext.registerVariable(
        variableBinding.varRef.namespaceURI,
        variableBinding.varRef.localName
      )
    );
    super.performStaticEvaluation(staticContext);
    staticContext.removeScope();
    this.isUpdating = this._variableBindings.some((varBinding) => varBinding.sourceExpr.isUpdating) || this._returnExpr.isUpdating;
  }
};
var TransformExpression_default = TransformExpression;

// ../gh/fontoxpath/src/expressions/xquery/AttributeConstructor.ts
function createAttribute(name2, value) {
  const tinyAttributeNode = {
    nodeType: 2 /* ATTRIBUTE_NODE */,
    isTinyNode: true,
    nodeName: name2.buildPrefixedName(),
    namespaceURI: name2.namespaceURI,
    prefix: name2.prefix,
    localName: name2.localName,
    name: name2.buildPrefixedName(),
    value
  };
  return { node: tinyAttributeNode, graftAncestor: null };
}
var AttributeConstructor = class extends Expression_default {
  constructor(name2, value) {
    let childExpressions = value.valueExprParts || [];
    childExpressions = childExpressions.concat(name2.expr || []);
    super(new Specificity_default({}), childExpressions, {
      canBeStaticallyEvaluated: false,
      resultOrder: "unsorted" /* UNSORTED */
    });
    if (name2.expr) {
      this._nameExpr = name2.expr;
    } else {
      this.name = new QName_default(
        name2.prefix,
        name2.namespaceURI,
        name2.localName
      );
    }
    this._value = value;
    this._staticContext = void 0;
  }
  evaluate(dynamicContext, executionParameters) {
    let nameIterator;
    let name2;
    let valueIterator;
    let done = false;
    return sequenceFactory_default.create({
      next: () => {
        if (done) {
          return DONE_TOKEN;
        }
        if (!name2) {
          if (this._nameExpr) {
            if (!nameIterator) {
              const nameSequence = this._nameExpr.evaluate(
                dynamicContext,
                executionParameters
              );
              nameIterator = evaluateQNameExpression(
                this._staticContext,
                executionParameters,
                nameSequence
              );
            }
            const nv = nameIterator.next(0 /* NONE */);
            name2 = nv.value.value;
          } else {
            name2 = this.name;
          }
          if (name2) {
            if (name2.prefix === "xmlns") {
              throw errXQDY0044(name2);
            }
            if (name2.prefix === "" && name2.localName === "xmlns") {
              throw errXQDY0044(name2);
            }
            if (name2.namespaceURI === "http://www.w3.org/2000/xmlns/" /* XMLNS_NAMESPACE_URI */) {
              throw errXQDY0044(name2);
            }
            if (name2.prefix === "xml" && name2.namespaceURI !== "http://www.w3.org/XML/1998/namespace" /* XML_NAMESPACE_URI */) {
              throw errXQDY0044(name2);
            }
            if (name2.prefix !== "" && name2.prefix !== "xml" && name2.namespaceURI === "http://www.w3.org/XML/1998/namespace" /* XML_NAMESPACE_URI */) {
              throw errXQDY0044(name2);
            }
          }
        }
        if (this._value.valueExprParts) {
          const valueExprParts = this._value.valueExprParts;
          if (!valueIterator) {
            valueIterator = concatSequences(
              valueExprParts.map((expr) => {
                return atomize(
                  expr.evaluate(dynamicContext, executionParameters),
                  executionParameters
                ).mapAll(
                  (allValues) => sequenceFactory_default.singleton(
                    createAtomicValue(
                      allValues.map((val) => val.value).join(" "),
                      1 /* XSSTRING */
                    )
                  )
                );
              })
            ).mapAll(
              (allValueParts) => sequenceFactory_default.singleton(
                createPointerValue(
                  createAttribute(
                    name2,
                    allValueParts.map((val) => val.value).join("")
                  ),
                  executionParameters.domFacade
                )
              )
            ).value;
          }
          return valueIterator.next(0 /* NONE */);
        }
        done = true;
        return ready(
          createPointerValue(
            createAttribute(name2, this._value.value),
            executionParameters.domFacade
          )
        );
      }
    });
  }
  performStaticEvaluation(staticContext) {
    this._staticContext = staticContext.cloneContext();
    if (this.name) {
      if (this.name.prefix && !this.name.namespaceURI) {
        const namespaceURI = staticContext.resolveNamespace(this.name.prefix);
        if (namespaceURI === void 0 && this.name.prefix) {
          throw errXPST0081(this.name.prefix);
        }
        this.name.namespaceURI = namespaceURI || null;
      }
    }
    super.performStaticEvaluation(staticContext);
  }
};
var AttributeConstructor_default = AttributeConstructor;

// ../gh/fontoxpath/src/expressions/xquery/CommentConstructor.ts
var CommentConstructor = class extends Expression_default {
  constructor(expr) {
    super(expr ? expr.specificity : new Specificity_default({}), expr ? [expr] : [], {
      canBeStaticallyEvaluated: false,
      resultOrder: "unsorted" /* UNSORTED */
    });
    this._expr = expr;
  }
  evaluate(_dynamicContext, executionParameters) {
    const tinyCommentNode = {
      data: "",
      isTinyNode: true,
      nodeType: 8 /* COMMENT_NODE */
    };
    const commentNodePointer = {
      node: tinyCommentNode,
      graftAncestor: null
    };
    if (!this._expr) {
      return sequenceFactory_default.singleton(
        createPointerValue(commentNodePointer, executionParameters.domFacade)
      );
    }
    const sequence2 = this._expr.evaluateMaybeStatically(_dynamicContext, executionParameters);
    return atomize(sequence2, executionParameters).mapAll((items) => {
      const content = items.map((item) => castToType(item, 1 /* XSSTRING */).value).join(" ");
      if (content.indexOf("-->") !== -1) {
        throw new Error(
          'XQDY0072: The contents of the data of a comment may not include "-->"'
        );
      }
      tinyCommentNode.data = content;
      return sequenceFactory_default.singleton(
        createPointerValue(commentNodePointer, executionParameters.domFacade)
      );
    });
  }
};
var CommentConstructor_default = CommentConstructor;

// ../gh/fontoxpath/src/expressions/xquery/ElementConstructor.ts
var ElementConstructor = class extends Expression_default {
  constructor(name2, attributes, namespaceDeclarations, contents) {
    super(new Specificity_default({}), contents.concat(attributes).concat(name2.expr || []), {
      canBeStaticallyEvaluated: false,
      resultOrder: "unsorted" /* UNSORTED */
    });
    if (name2.expr) {
      this._nameExpr = name2.expr;
    } else {
      this._name = new QName_default(
        name2.prefix,
        name2.namespaceURI,
        name2.localName
      );
    }
    this._namespacesInScope = namespaceDeclarations.reduce(
      (namespacesInScope, namespaceDecl) => {
        if (namespaceDecl.prefix in namespacesInScope) {
          throw new Error(
            `XQST0071: The namespace declaration with the prefix ${namespaceDecl.prefix} has already been declared on the constructed element.`
          );
        }
        namespacesInScope[namespaceDecl.prefix || ""] = namespaceDecl.uri;
        return namespacesInScope;
      },
      {}
    );
    this._attributes = attributes;
    this._contents = contents;
    this._staticContext = void 0;
  }
  evaluate(dynamicContext, executionParameters) {
    const domFacade2 = executionParameters.domFacade;
    let attributePhaseDone = false;
    let attributesSequence;
    let attributeNodes;
    let childNodesPhaseDone = false;
    let childNodesSequences;
    let allChildNodes;
    let nameIterator;
    let done = false;
    return sequenceFactory_default.create({
      next: () => {
        if (done) {
          return DONE_TOKEN;
        }
        if (!attributePhaseDone) {
          if (!attributesSequence) {
            attributesSequence = concatSequences(
              this._attributes.map(
                (attr) => attr.evaluateMaybeStatically(dynamicContext, executionParameters)
              )
            );
          }
          const allAttributes = attributesSequence.getAllValues();
          attributeNodes = allAttributes;
          attributePhaseDone = true;
        }
        if (!childNodesPhaseDone) {
          if (!childNodesSequences) {
            childNodesSequences = this._contents.map(
              (contentExpression) => contentExpression.evaluateMaybeStatically(
                dynamicContext,
                executionParameters
              )
            );
          }
          const newChildNodes = [];
          for (let i4 = 0; i4 < childNodesSequences.length; i4++) {
            const allValues = childNodesSequences[i4].getAllValues();
            newChildNodes.push(allValues);
          }
          allChildNodes = newChildNodes;
          childNodesPhaseDone = true;
        }
        if (this._nameExpr) {
          if (!nameIterator) {
            const nameSequence = this._nameExpr.evaluate(
              dynamicContext,
              executionParameters
            );
            nameIterator = evaluateQNameExpression(
              this._staticContext,
              executionParameters,
              nameSequence
            );
          }
          const nv = nameIterator.next(0 /* NONE */);
          this._name = nv.value.value;
        }
        if (this._name.prefix === "xmlns" || this._name.namespaceURI === "http://www.w3.org/2000/xmlns/" /* XMLNS_NAMESPACE_URI */ || this._name.prefix === "xml" && this._name.namespaceURI !== "http://www.w3.org/XML/1998/namespace" /* XML_NAMESPACE_URI */ || this._name.prefix && this._name.prefix !== "xml" && this._name.namespaceURI === "http://www.w3.org/XML/1998/namespace" /* XML_NAMESPACE_URI */) {
          throw errXQDY0096(this._name);
        }
        const childNodes = [];
        const attributes = [];
        const tinyElementNode = {
          nodeType: 1 /* ELEMENT_NODE */,
          isTinyNode: true,
          attributes,
          childNodes,
          nodeName: this._name.buildPrefixedName(),
          namespaceURI: this._name.namespaceURI,
          prefix: this._name.prefix,
          localName: this._name.localName
        };
        const pointer = { node: tinyElementNode, graftAncestor: null };
        attributeNodes.forEach((attr) => {
          tinyElementNode.attributes.push(attr.value.node);
        });
        const parsedContent = parseContent(allChildNodes, executionParameters, errXQTY0024);
        parsedContent.attributes.forEach((attrNode) => {
          if (tinyElementNode.attributes.find(
            (attr) => attr.namespaceURI === attrNode.namespaceURI && attr.localName === attrNode.localName
          )) {
            throw errXQDY0025(attrNode.name);
          }
          tinyElementNode.attributes.push(attrNode);
        });
        parsedContent.contentNodes.forEach((childNode) => {
          tinyElementNode.childNodes.push(childNode);
        });
        for (let i4 = 0; i4 < tinyElementNode.childNodes.length; i4++) {
          const currentChildNode = tinyElementNode.childNodes[i4];
          if (!isTinyNode(currentChildNode) || currentChildNode.nodeType !== 3 /* TEXT_NODE */) {
            continue;
          }
          const previousChildNode = tinyElementNode.childNodes[i4 - 1];
          if (previousChildNode && isTinyNode(previousChildNode) && previousChildNode.nodeType === 3 /* TEXT_NODE */) {
            previousChildNode.data = previousChildNode.data + currentChildNode.data;
            tinyElementNode.childNodes.splice(i4, 1);
            i4--;
          }
        }
        done = true;
        return ready(createPointerValue(pointer, domFacade2));
      }
    });
  }
  performStaticEvaluation(staticContext) {
    staticContext.introduceScope();
    Object.keys(this._namespacesInScope).forEach(
      (prefix2) => staticContext.registerNamespace(prefix2, this._namespacesInScope[prefix2])
    );
    this._childExpressions.forEach(
      (subselector) => subselector.performStaticEvaluation(staticContext)
    );
    this._attributes.reduce((attributeNames, attribute) => {
      if (attribute.name) {
        const attributeNamespaceURI = attribute.name.namespaceURI === null ? staticContext.resolveNamespace(attribute.name.prefix) : attribute.name.namespaceURI;
        const uriQualifiedName2 = `Q{${attributeNamespaceURI}}${attribute.name.localName}`;
        if (attributeNames.includes(uriQualifiedName2)) {
          throw errXQST0040(uriQualifiedName2);
        }
        attributeNames.push(uriQualifiedName2);
      }
      return attributeNames;
    }, []);
    if (this._name && this._name.namespaceURI === null) {
      const namespaceURI = staticContext.resolveNamespace(this._name.prefix);
      if (namespaceURI === void 0 && this._name.prefix) {
        throw errXPST0081(this._name.prefix);
      }
      this._name.namespaceURI = namespaceURI;
    }
    this._staticContext = staticContext.cloneContext();
    staticContext.removeScope();
  }
};
var ElementConstructor_default = ElementConstructor;

// ../gh/fontoxpath/src/expressions/xquery/PIConstructor.ts
function assertValidTarget(target) {
  if (/^xml$/i.test(target)) {
    throw new Error(`XQDY0064: The target of a created PI may not be "${target}"`);
  }
}
function createPIPointer(target, data) {
  const tinyPINode = {
    data,
    isTinyNode: true,
    nodeName: target,
    nodeType: 7 /* PROCESSING_INSTRUCTION_NODE */,
    target
  };
  return { node: tinyPINode, graftAncestor: null };
}
var PIConstructor = class extends Expression_default {
  constructor(target, dataExpr) {
    const expressions = target.targetExpr ? [target.targetExpr].concat(dataExpr) : [dataExpr];
    super(
      expressions.reduce((specificity, selector) => {
        return specificity.add(selector.specificity);
      }, new Specificity_default({})),
      expressions,
      {
        canBeStaticallyEvaluated: false,
        resultOrder: "unsorted" /* UNSORTED */
      }
    );
    this._target = target;
    this._dataExpr = dataExpr;
  }
  evaluate(dynamicContext, executionParameters) {
    const dataSequence = this._dataExpr.evaluateMaybeStatically(
      dynamicContext,
      executionParameters
    );
    return atomize(dataSequence, executionParameters).mapAll((items) => {
      const data = items.map((item) => castToType(item, 1 /* XSSTRING */).value).join(" ");
      if (data.indexOf("?>") !== -1) {
        throw new Error(
          'XQDY0026: The contents of the data of a processing instruction may not include "?>"'
        );
      }
      if (this._target.targetValue !== null) {
        const target = this._target.targetValue;
        assertValidTarget(target);
        return sequenceFactory_default.singleton(
          createPointerValue(
            createPIPointer(target, data),
            executionParameters.domFacade
          )
        );
      }
      const targetSequence = this._target.targetExpr.evaluateMaybeStatically(
        dynamicContext,
        executionParameters
      );
      const targetIterator = evaluateNCNameExpression(executionParameters, targetSequence);
      return sequenceFactory_default.create({
        next: () => {
          const tv = targetIterator.next(0 /* NONE */);
          if (tv.done) {
            return tv;
          }
          const target = tv.value.value;
          assertValidTarget(target);
          return ready(
            createPointerValue(
              createPIPointer(target, data),
              executionParameters.domFacade
            )
          );
        }
      });
    });
  }
};
var PIConstructor_default = PIConstructor;

// ../gh/fontoxpath/src/expressions/xquery/TextConstructor.ts
var TextConstructor = class extends Expression_default {
  constructor(expr) {
    super(expr ? expr.specificity : new Specificity_default({}), expr ? [expr] : [], {
      canBeStaticallyEvaluated: false,
      resultOrder: "unsorted" /* UNSORTED */
    });
    this._expr = expr;
  }
  evaluate(dynamicContext, executionParameters) {
    if (!this._expr) {
      return sequenceFactory_default.empty();
    }
    const sequence2 = this._expr.evaluateMaybeStatically(dynamicContext, executionParameters);
    return atomize(sequence2, executionParameters).mapAll((items) => {
      if (items.length === 0) {
        return sequenceFactory_default.empty();
      }
      const content = items.map((item) => castToType(item, 1 /* XSSTRING */).value).join(" ");
      const tinyTextNode = {
        data: content,
        isTinyNode: true,
        nodeType: 3 /* TEXT_NODE */
      };
      const textNodePointer = { node: tinyTextNode, graftAncestor: null };
      return sequenceFactory_default.singleton(
        createPointerValue(textNodePointer, executionParameters.domFacade)
      );
    });
  }
};
var TextConstructor_default = TextConstructor;

// ../gh/fontoxpath/src/expressions/xquery/TypeSwitchExpression.ts
var TypeSwitchExpression = class extends PossiblyUpdatingExpression {
  constructor(argExpression, caseClauses, defaultExpression, type) {
    const specificity = new Specificity_default({});
    super(
      specificity,
      [
        argExpression,
        ...caseClauses.map((clause) => clause.caseClauseExpression),
        defaultExpression
      ].concat(
        ...caseClauses.map(
          (clause) => clause.typeTests.map((typetest) => typetest.typeTest)
        )
      ),
      {
        canBeStaticallyEvaluated: false,
        peer: false,
        resultOrder: "unsorted" /* UNSORTED */,
        subtree: false
      },
      type
    );
    this._argExpression = argExpression;
    this._amountOfCases = caseClauses.length;
    this._typeTestsByCase = caseClauses.map((clause) => clause.typeTests);
  }
  performFunctionalEvaluation(dynamicContext, executionParameters, sequenceCallbacks) {
    const evaluatedExpression = sequenceCallbacks[0](dynamicContext);
    return evaluatedExpression.mapAll((allValues) => {
      for (let i4 = 0; i4 < this._amountOfCases; i4++) {
        const typeTests = this._typeTestsByCase[i4];
        if (typeTests.some((typeTest2) => {
          switch (typeTest2.occurrenceIndicator) {
            case "?":
              if (allValues.length > 1) {
                return false;
              }
              break;
            case "*":
              break;
            case "+":
              if (allValues.length < 1) {
                return false;
              }
              break;
            default:
              if (allValues.length !== 1) {
                return false;
              }
          }
          const contextItems = sequenceFactory_default.create(allValues);
          return allValues.every((value, j2) => {
            const scopedContext = dynamicContext.scopeWithFocus(
              j2,
              value,
              contextItems
            );
            return typeTest2.typeTest.evaluateMaybeStatically(scopedContext, executionParameters).getEffectiveBooleanValue();
          });
        })) {
          return sequenceCallbacks[i4 + 1](dynamicContext);
        }
      }
      return sequenceCallbacks[this._amountOfCases + 1](dynamicContext);
    });
  }
  performStaticEvaluation(staticContext) {
    super.performStaticEvaluation(staticContext);
    if (this._argExpression.isUpdating) {
      throw errXUST0001();
    }
  }
};
var TypeSwitchExpression_default = TypeSwitchExpression;

// ../gh/fontoxpath/src/expressions/xquery/SwitchExpression.ts
var SwitchExpression = class extends PossiblyUpdatingExpression {
  constructor(argExpression, caseClauses, defaultExpression, type) {
    const specificity = new Specificity_default({});
    super(
      specificity,
      [
        argExpression,
        defaultExpression,
        ...caseClauses.map((clause) => clause.caseClauseExpression)
      ].concat(...caseClauses.map((clause) => clause.tests.map((test) => test))),
      {
        canBeStaticallyEvaluated: false,
        peer: false,
        resultOrder: "unsorted" /* UNSORTED */,
        subtree: false
      },
      type
    );
    this._argExpression = argExpression;
    this._amountOfCases = caseClauses.length;
    this._testsByCase = caseClauses.map((clause) => clause.tests);
  }
  performFunctionalEvaluation(dynamicContext, executionParameters, sequenceCallbacks) {
    const evaluatedExpression = atomizeSequence(
      sequenceCallbacks[0](dynamicContext),
      executionParameters
    );
    const [
      _argSequenceCallback,
      defaultSequenceCallback,
      ...caseClauseAndTestSequenceCallbacks
    ] = sequenceCallbacks;
    return evaluatedExpression.switchCases({
      multiple: () => {
        throw errXPTY00042(
          "The operand for a switch expression should result in zero or one item"
        );
      },
      default: () => {
        const singleValue = evaluatedExpression.first();
        const isEmpty = !singleValue;
        for (let i4 = 0; i4 < this._amountOfCases; i4++) {
          const results = this._testsByCase[i4].map(
            (x2) => x2.evaluateMaybeStatically(dynamicContext, executionParameters)
          );
          for (const result of results) {
            const atomizedResult = atomizeSequence(result, executionParameters);
            if (atomizedResult.isEmpty()) {
              if (isEmpty) {
                return caseClauseAndTestSequenceCallbacks[i4](dynamicContext);
              }
              continue;
            }
            if (!atomizedResult.isSingleton()) {
              throw errXPTY00042(
                "The operand for a switch case should result in zero or one item"
              );
            }
            if (isEmpty) {
              continue;
            }
            const first = atomizedResult.first();
            if (itemDeepEqual(
              dynamicContext,
              executionParameters,
              null,
              singleValue,
              first
            ).next(0 /* NONE */).value) {
              return caseClauseAndTestSequenceCallbacks[i4](dynamicContext);
            }
          }
        }
        return defaultSequenceCallback(dynamicContext);
      }
    });
  }
  performStaticEvaluation(staticContext) {
    super.performStaticEvaluation(staticContext);
    if (this._argExpression.isUpdating) {
      throw errXUST0001();
    }
  }
};
var SwitchExpression_default = SwitchExpression;

// ../gh/fontoxpath/src/parsing/compileAstToExpression.ts
var COMPILATION_OPTIONS = {
  XPATH_MODE: { allowXQuery: false, allowUpdating: false },
  XQUERY_MODE: { allowXQuery: true, allowUpdating: false },
  XQUERY_UPDATING_MODE: { allowXQuery: true, allowUpdating: true }
};
function disallowUpdating(compilationOptions) {
  if (!compilationOptions.allowXQuery) {
    return COMPILATION_OPTIONS.XPATH_MODE;
  }
  if (!compilationOptions.allowUpdating) {
    return COMPILATION_OPTIONS.XQUERY_MODE;
  }
  return COMPILATION_OPTIONS.XQUERY_UPDATING_MODE;
}
function compile(ast, compilationOptions) {
  const name2 = ast[0];
  switch (name2) {
    // Operators
    case "andOp":
      return andOp(ast, compilationOptions);
    case "orOp":
      return orOp(ast, compilationOptions);
    case "unaryPlusOp":
      return unaryPlus(ast, compilationOptions);
    case "unaryMinusOp":
      return unaryMinus(ast, compilationOptions);
    case "addOp":
    case "subtractOp":
    case "multiplyOp":
    case "divOp":
    case "idivOp":
    case "modOp":
      return binaryOperator(ast, compilationOptions);
    case "sequenceExpr":
      return sequence(ast, compilationOptions);
    case "unionOp":
      return unionOp(ast, compilationOptions);
    case "otherwiseOp":
      return otherwiseOp(ast, compilationOptions);
    case "exceptOp":
    case "intersectOp":
      return intersectExcept(ast, compilationOptions);
    case "stringConcatenateOp":
      return stringConcatenateOp(ast, compilationOptions);
    case "rangeSequenceExpr":
      return rangeSequenceExpr(ast, compilationOptions);
    // Compares
    case "equalOp":
    case "notEqualOp":
    case "lessThanOrEqualOp":
    case "lessThanOp":
    case "greaterThanOrEqualOp":
    case "greaterThanOp":
      return compare2("generalCompare", ast, compilationOptions);
    case "eqOp":
    case "neOp":
    case "ltOp":
    case "leOp":
    case "gtOp":
    case "geOp":
      return compare2("valueCompare", ast, compilationOptions);
    case "isOp":
    case "nodeBeforeOp":
    case "nodeAfterOp":
      return compare2("nodeCompare", ast, compilationOptions);
    // Path
    case "pathExpr":
      return pathExpr(ast, compilationOptions);
    case "contextItemExpr":
      const type = astHelper_default.getAttribute(ast, "type");
      return new ContextItemExpression_default(type);
    // Functions
    case "functionCallExpr":
      return functionCall(ast, compilationOptions);
    case "inlineFunctionExpr":
      return inlineFunction(ast, compilationOptions);
    case "arrowExpr":
      return arrowExpr(ast, compilationOptions);
    case "dynamicFunctionInvocationExpr":
      return dynamicFunctionInvocationExpr(ast, compilationOptions);
    case "namedFunctionRef":
      return namedFunctionRef(ast, compilationOptions);
    // Literals
    case "integerConstantExpr":
      return integerConstantExpr(ast, compilationOptions);
    case "stringConstantExpr":
      return stringConstantExpr(ast, compilationOptions);
    case "decimalConstantExpr":
      return decimalConstantExpr(ast, compilationOptions);
    case "doubleConstantExpr":
      return doubleConstantExpr(ast, compilationOptions);
    // Variables
    case "varRef":
      return varRef(ast, compilationOptions);
    case "flworExpr":
      return flworExpression(ast, compilationOptions);
    // Quantified
    case "quantifiedExpr":
      return quantified(ast, compilationOptions);
    // Conditional
    case "ifThenElseExpr":
      return IfThenElseExpr(ast, compilationOptions);
    case "instanceOfExpr":
      return instanceOf(ast, compilationOptions);
    case "castExpr":
      return castAs(ast, compilationOptions);
    case "castableExpr":
      return castableAs(ast, compilationOptions);
    case "simpleMapExpr":
      return simpleMap(ast, compilationOptions);
    case "mapConstructor":
      return mapConstructor(ast, compilationOptions);
    case "arrayConstructor":
      return arrayConstructor(ast, compilationOptions);
    case "unaryLookup":
      const returnType = astHelper_default.getAttribute(ast, "type");
      return new UnaryLookup_default(compileLookup(ast, compilationOptions), returnType);
    case "typeswitchExpr":
      return typeswitchExpr(ast, compilationOptions);
    case "switchExpr":
      return switchExpr(ast, compilationOptions);
    // XQuery node constructors
    case "elementConstructor":
      return dirElementConstructor(ast, compilationOptions);
    case "attributeConstructor":
      return attributeConstructor(ast, compilationOptions);
    case "computedAttributeConstructor":
      return computedAttributeConstructor(ast, compilationOptions);
    case "computedCommentConstructor":
      return computedCommentConstructor(ast, compilationOptions);
    case "computedTextConstructor":
      return computedTextConstructor(ast, compilationOptions);
    case "computedElementConstructor":
      return computedElementConstructor(ast, compilationOptions);
    case "computedPIConstructor":
      return computedPIConstructor(ast, compilationOptions);
    case "CDataSection":
      return CDataSection(ast, compilationOptions);
    // XQuery update facility
    case "deleteExpr":
      return deleteExpression(ast, compilationOptions);
    case "insertExpr":
      return insertExpression(ast, compilationOptions);
    case "renameExpr":
      return renameExpression(ast, compilationOptions);
    case "replaceExpr":
      return replaceExpression(ast, compilationOptions);
    case "transformExpr":
      return transformExpression(ast, compilationOptions);
    case "x:stackTrace":
      return stackTrace(ast, compilationOptions);
    // Some simple aliases:
    case "ifClause":
    case "thenClause":
    case "elseClause":
      return compile(astHelper_default.getFirstChild(ast, "*"), compilationOptions);
    default:
      return compileTest(ast, compilationOptions);
  }
}
function compileTest(ast, compilationOptions) {
  switch (ast[0]) {
    // Tests
    case "nameTest":
      return nameTest(ast, compilationOptions);
    case "piTest":
      return piTest(ast, compilationOptions);
    case "commentTest":
      return commentTest(ast, compilationOptions);
    case "textTest":
      return textTest(ast, compilationOptions);
    case "documentTest":
      return documentTest(ast, compilationOptions);
    case "attributeTest":
      return attributeTest(ast, compilationOptions);
    case "elementTest":
      return elementTest(ast, compilationOptions);
    case "anyKindTest":
      return anyKindTest();
    case "anyMapTest":
      return anyMapTest(ast, compilationOptions);
    case "anyArrayTest":
      return anyArrayTest(ast, compilationOptions);
    case "Wildcard":
      return wildcard(ast, compilationOptions);
    case "atomicType":
      return typeTest(ast, compilationOptions);
    case "anyItemType":
      return anyItemTest();
    case "unionNodeTest":
      return unionNodeTest(ast, compilationOptions);
    default:
      throw new Error("No selector counterpart for: " + ast[0] + ".");
  }
}
function stackTrace(ast, compilationOptions) {
  const innerExpression = ast[2];
  let nextCompilableExpression = innerExpression;
  while (nextCompilableExpression[0] === "x:stackTrace") {
    ast = nextCompilableExpression;
    nextCompilableExpression = nextCompilableExpression[2];
  }
  const location = ast[1];
  return new StackTraceGenerator(
    location,
    nextCompilableExpression[0],
    compile(nextCompilableExpression, compilationOptions),
    location.comment
  );
}
function arrayConstructor(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  const arrConstructor = astHelper_default.getFirstChild(ast, "*");
  const members = astHelper_default.getChildren(arrConstructor, "arrayElem").map(
    (arrayElem) => compile(astHelper_default.getFirstChild(arrayElem, "*"), disallowUpdating(compilationOptions))
  );
  switch (arrConstructor[0]) {
    case "curlyArray":
      return new CurlyArrayConstructor_default(members, type);
    case "squareArray":
      return new SquareArrayConstructor_default(members, type);
    default:
      throw new Error("Unrecognized arrayType: " + arrConstructor[0]);
  }
}
function mapConstructor(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  return new MapConstructor_default(
    astHelper_default.getChildren(ast, "mapConstructorEntry").map((keyValuePair) => ({
      key: compile(
        astHelper_default.followPath(keyValuePair, ["mapKeyExpr", "*"]),
        disallowUpdating(compilationOptions)
      ),
      value: compile(
        astHelper_default.followPath(keyValuePair, ["mapValueExpr", "*"]),
        disallowUpdating(compilationOptions)
      )
    })),
    type
  );
}
function unwrapBinaryOperator(operatorName, ast, compilationOptions) {
  const compiledAstNodes = [];
  function unwrapInner(innerAst) {
    const firstOperand = astHelper_default.getFirstChild(
      astHelper_default.getFirstChild(innerAst, "firstOperand"),
      "*"
    );
    const secondOperand = astHelper_default.getFirstChild(
      astHelper_default.getFirstChild(innerAst, "secondOperand"),
      "*"
    );
    if (firstOperand[0] === operatorName) {
      unwrapInner(firstOperand);
    } else {
      compiledAstNodes.push(compile(firstOperand, compilationOptions));
    }
    if (secondOperand[0] === operatorName) {
      unwrapInner(secondOperand);
    } else {
      compiledAstNodes.push(compile(secondOperand, compilationOptions));
    }
  }
  unwrapInner(ast);
  return compiledAstNodes;
}
function andOp(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  return new AndOperator_default(
    unwrapBinaryOperator("andOp", ast, disallowUpdating(compilationOptions)),
    type
  );
}
function orOp(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  return new OrOperator_default(
    unwrapBinaryOperator("orOp", ast, disallowUpdating(compilationOptions)),
    type
  );
}
function binaryOperator(ast, compilationOptions) {
  const kind = ast[0];
  const a4 = compile(
    astHelper_default.followPath(ast, ["firstOperand", "*"]),
    disallowUpdating(compilationOptions)
  );
  const b3 = compile(
    astHelper_default.followPath(ast, ["secondOperand", "*"]),
    disallowUpdating(compilationOptions)
  );
  const attributeType = astHelper_default.getAttribute(ast, "type");
  const first = astHelper_default.getAttribute(astHelper_default.followPath(ast, ["firstOperand", "*"]), "type");
  const second = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, ["secondOperand", "*"]),
    "type"
  );
  let evaluateFunction;
  if (first && second && astHelper_default.getAttribute(ast, "type")) {
    evaluateFunction = generateBinaryOperatorFunction(kind, first.type, second.type);
  }
  return new BinaryOperator_default(kind, a4, b3, attributeType, evaluateFunction);
}
function compileLookup(ast, compilationOptions) {
  const keyExpression = astHelper_default.getFirstChild(ast, "*");
  switch (keyExpression[0]) {
    case "NCName":
      return new Literal_default(astHelper_default.getTextContent(keyExpression), {
        type: 1 /* XSSTRING */,
        mult: 3 /* EXACTLY_ONE */
      });
    case "star":
      return "*";
    default:
      return compile(keyExpression, disallowUpdating(compilationOptions));
  }
}
function castAs(ast, compilationOptions) {
  const expression = compile(
    astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "argExpr"), "*"),
    disallowUpdating(compilationOptions)
  );
  const singleType2 = astHelper_default.getFirstChild(ast, "singleType");
  const targetType = astHelper_default.getQName(astHelper_default.getFirstChild(singleType2, "atomicType"));
  const optional = astHelper_default.getFirstChild(singleType2, "optional") !== null;
  return new CastAsOperator_default(expression, targetType, optional);
}
function castableAs(ast, compilationOptions) {
  const expression = compile(
    astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "argExpr"), "*"),
    disallowUpdating(compilationOptions)
  );
  const singleType2 = astHelper_default.getFirstChild(ast, "singleType");
  const targetType = astHelper_default.getQName(astHelper_default.getFirstChild(singleType2, "atomicType"));
  const optional = astHelper_default.getFirstChild(singleType2, "optional") !== null;
  return new CastableAsOperator_default(expression, targetType, optional);
}
function compare2(compareType, ast, compilationOptions) {
  const firstOperand = astHelper_default.followPath(ast, ["firstOperand", "*"]);
  const secondOperand = astHelper_default.followPath(ast, ["secondOperand", "*"]);
  const firstExpression = compile(firstOperand, disallowUpdating(compilationOptions));
  const secondExpression = compile(secondOperand, disallowUpdating(compilationOptions));
  switch (compareType) {
    case "valueCompare":
      return new ValueCompare(ast[0], firstExpression, secondExpression);
    case "nodeCompare":
      return new NodeCompare(ast[0], firstExpression, secondExpression);
    case "generalCompare":
      return new GeneralCompare(ast[0], firstExpression, secondExpression);
  }
}
function IfThenElseExpr(ast, compilationOptions) {
  const retType = astHelper_default.getAttribute(ast, "type");
  const ifClausePart = astHelper_default.getFirstChild(ast, "ifClause") || astHelper_default.getChildren(ast, "x:stackTrace")[0];
  const thenClausePart = astHelper_default.getFirstChild(ast, "thenClause") || astHelper_default.getChildren(ast, "x:stackTrace")[1];
  const elseClausePart = astHelper_default.getFirstChild(ast, "elseClause") || astHelper_default.getChildren(ast, "x:stackTrace")[2];
  return new IfExpression_default(
    compile(ifClausePart, disallowUpdating(compilationOptions)),
    compile(thenClausePart, compilationOptions),
    compile(elseClausePart, compilationOptions),
    retType
  );
}
function forClause(expressionClause, compilationOptions, returnClauseExpression) {
  const forClauseItems = astHelper_default.getChildren(expressionClause, "*");
  let returnExpr = returnClauseExpression;
  for (let i4 = forClauseItems.length - 1; i4 >= 0; --i4) {
    const forClauseItem = forClauseItems[i4];
    const expression = astHelper_default.followPath(forClauseItem, ["forExpr", "*"]);
    const positionalVariableBinding = astHelper_default.getFirstChild(
      forClauseItem,
      "positionalVariableBinding"
    );
    returnExpr = new ForExpression_default(
      astHelper_default.getQName(
        astHelper_default.followPath(forClauseItem, ["typedVariableBinding", "varName"])
      ),
      compile(expression, disallowUpdating(compilationOptions)),
      positionalVariableBinding ? astHelper_default.getQName(positionalVariableBinding) : null,
      returnExpr
    );
  }
  return returnExpr;
}
function letClause(expressionClause, compilationOptions, returnClauseExpression) {
  const letClauseItems = astHelper_default.getChildren(expressionClause, "*");
  let returnExpr = returnClauseExpression;
  for (let i4 = letClauseItems.length - 1; i4 >= 0; --i4) {
    const letClauseItem = letClauseItems[i4];
    const expression = astHelper_default.followPath(letClauseItem, ["letExpr", "*"]);
    returnExpr = new LetExpression_default(
      astHelper_default.getQName(
        astHelper_default.followPath(letClauseItem, ["typedVariableBinding", "varName"])
      ),
      compile(expression, disallowUpdating(compilationOptions)),
      returnExpr
    );
  }
  return returnExpr;
}
function whereClause(expressionClause, compilationOptions, returnClauseExpression) {
  const whereClauseItems = astHelper_default.getChildren(expressionClause, "*");
  let returnExpr = returnClauseExpression;
  for (let i4 = whereClauseItems.length - 1; i4 >= 0; --i4) {
    const whereClauseItem = whereClauseItems[i4];
    returnExpr = new WhereExpression_default(compile(whereClauseItem, compilationOptions), returnExpr);
  }
  return returnExpr;
}
function orderByClause(expressionClause, compilationOptions, returnClauseExpression) {
  const orderBySpecs = astHelper_default.getChildren(expressionClause, "*");
  return new OrderByExpression_default(
    orderBySpecs.filter((spec) => spec[0] !== "stable").map((spec) => {
      const orderModifier = astHelper_default.getFirstChild(spec, "orderModifier");
      const kind = orderModifier ? astHelper_default.getFirstChild(orderModifier, "orderingKind") : null;
      const mode = orderModifier ? astHelper_default.getFirstChild(orderModifier, "emptyOrderingMode") : null;
      const isAscending = kind ? astHelper_default.getTextContent(kind) === "ascending" : true;
      const isEmptyLeast = mode ? astHelper_default.getTextContent(mode) === "empty least" : true;
      return {
        expression: compile(
          astHelper_default.followPath(spec, ["orderByExpr", "*"]),
          compilationOptions
        ),
        isAscending,
        isEmptyLeast
      };
    }),
    returnClauseExpression
  );
}
function flworExpression(ast, compilationOptions) {
  const clausesAndReturnClause = astHelper_default.getChildren(ast, "*");
  const returnClauseExpression = astHelper_default.getFirstChild(
    clausesAndReturnClause[clausesAndReturnClause.length - 1],
    "*"
  );
  const clauses = clausesAndReturnClause.slice(0, -1);
  if (clauses.length > 1) {
    if (!compilationOptions.allowXQuery) {
      throw new Error("XPST0003: Use of XQuery FLWOR expressions in XPath is no allowed");
    }
  }
  return clauses.reduceRight(
    (returnOfPreviousExpression, flworExpressionClause) => {
      switch (flworExpressionClause[0]) {
        case "forClause":
          return forClause(
            flworExpressionClause,
            compilationOptions,
            returnOfPreviousExpression
          );
        case "letClause":
          return letClause(
            flworExpressionClause,
            compilationOptions,
            returnOfPreviousExpression
          );
        case "whereClause":
          return whereClause(
            flworExpressionClause,
            compilationOptions,
            returnOfPreviousExpression
          );
        case "windowClause":
          throw new Error(
            `Not implemented: ${flworExpressionClause[0]} is not implemented yet.`
          );
        case "groupByClause":
          throw new Error(
            `Not implemented: ${flworExpressionClause[0]} is not implemented yet.`
          );
        case "orderByClause":
          return orderByClause(
            flworExpressionClause,
            compilationOptions,
            returnOfPreviousExpression
          );
        case "countClause":
          throw new Error(
            `Not implemented: ${flworExpressionClause[0]} is not implemented yet.`
          );
        default:
          throw new Error(
            `Not implemented: ${flworExpressionClause[0]} is not supported in a flwor expression`
          );
      }
    },
    compile(returnClauseExpression, compilationOptions)
  );
}
function functionCall(ast, compilationOptions) {
  const functionName = astHelper_default.getFirstChild(ast, "functionName");
  const functionArguments = astHelper_default.getChildren(astHelper_default.getFirstChild(ast, "arguments"), "*");
  const returnType = astHelper_default.getAttribute(ast, "type");
  return new FunctionCall_default(
    new NamedFunctionRef_default(
      astHelper_default.getQName(functionName),
      functionArguments.length,
      returnType
    ),
    functionArguments.map(
      (arg) => arg[0] === "argumentPlaceholder" ? null : compile(arg, compilationOptions)
    ),
    returnType
  );
}
function arrowExpr(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  const argExpr = astHelper_default.followPath(ast, ["argExpr", "*"]);
  const parts = astHelper_default.getChildren(ast, "*").slice(1);
  let args = [compile(argExpr, compilationOptions)];
  for (let i4 = 0; i4 < parts.length; i4++) {
    if (parts[i4][0] === "arguments") {
      continue;
    }
    if (parts[i4 + 1][0] === "arguments") {
      const functionArguments = astHelper_default.getChildren(parts[i4 + 1], "*");
      args = args.concat(
        functionArguments.map(
          (arg) => arg[0] === "argumentPlaceholder" ? null : compile(arg, compilationOptions)
        )
      );
    }
    const func = parts[i4][0] === "EQName" ? new NamedFunctionRef_default(astHelper_default.getQName(parts[i4]), args.length, type) : compile(parts[i4], disallowUpdating(compilationOptions));
    args = [new FunctionCall_default(func, args, type)];
  }
  return args[0];
}
function dynamicFunctionInvocationExpr(ast, compilationOptions) {
  const functionItemContent = astHelper_default.followPath(ast, ["functionItem", "*"]);
  const retType = astHelper_default.getAttribute(ast, "type");
  const argumentsAst = astHelper_default.getFirstChild(ast, "arguments");
  let args = [];
  if (argumentsAst) {
    const functionArguments = astHelper_default.getChildren(argumentsAst, "*");
    args = functionArguments.map(
      (arg) => arg[0] === "argumentPlaceholder" ? null : compile(arg, compilationOptions)
    );
  }
  return new FunctionCall_default(compile(functionItemContent, compilationOptions), args, retType);
}
function namedFunctionRef(ast, _compilationOptions) {
  const functionName = astHelper_default.getFirstChild(ast, "functionName");
  const type = astHelper_default.getAttribute(ast, "type");
  const arity = astHelper_default.getTextContent(
    astHelper_default.followPath(ast, ["integerConstantExpr", "value"])
  );
  return new NamedFunctionRef_default(astHelper_default.getQName(functionName), parseInt(arity, 10), type);
}
function inlineFunction(ast, compilationOptions) {
  const params = astHelper_default.getChildren(astHelper_default.getFirstChild(ast, "paramList"), "*");
  const functionBody = astHelper_default.followPath(ast, ["functionBody", "*"]);
  const type = astHelper_default.getAttribute(ast, "type");
  return new InlineFunction_default(
    params.map((param) => {
      const td = {
        name: astHelper_default.getQName(astHelper_default.getFirstChild(param, "varName")),
        type: astHelper_default.getTypeDeclaration(param)
      };
      return td;
    }),
    astHelper_default.getTypeDeclaration(ast),
    functionBody ? compile(functionBody, compilationOptions) : new SequenceOperator_default([], type)
  );
}
function instanceOf(ast, compilationOptions) {
  const expression = compile(astHelper_default.followPath(ast, ["argExpr", "*"]), compilationOptions);
  const sequenceType = astHelper_default.followPath(ast, ["sequenceType", "*"]);
  const occurrence = astHelper_default.followPath(ast, ["sequenceType", "occurrenceIndicator"]);
  const type = astHelper_default.getAttribute(ast, "type");
  return new InstanceOfOperator_default(
    expression,
    compile(sequenceType, disallowUpdating(compilationOptions)),
    occurrence ? astHelper_default.getTextContent(occurrence) : "",
    type
  );
}
function integerConstantExpr(ast, _compilationOptions) {
  return new Literal_default(astHelper_default.getTextContent(astHelper_default.getFirstChild(ast, "value")), {
    type: 5 /* XSINTEGER */,
    mult: 3 /* EXACTLY_ONE */
  });
}
function stringConstantExpr(ast, _compilationOptions) {
  return new Literal_default(astHelper_default.getTextContent(astHelper_default.getFirstChild(ast, "value")), {
    type: 1 /* XSSTRING */,
    mult: 3 /* EXACTLY_ONE */
  });
}
function decimalConstantExpr(ast, _compilationOptions) {
  return new Literal_default(astHelper_default.getTextContent(astHelper_default.getFirstChild(ast, "value")), {
    type: 4 /* XSDECIMAL */,
    mult: 3 /* EXACTLY_ONE */
  });
}
function doubleConstantExpr(ast, _compilationOptions) {
  return new Literal_default(astHelper_default.getTextContent(astHelper_default.getFirstChild(ast, "value")), {
    type: 3 /* XSDOUBLE */,
    mult: 3 /* EXACTLY_ONE */
  });
}
function nameTest(ast, _compilationOptions) {
  return new NameTest_default(astHelper_default.getQName(ast));
}
function anyKindTest() {
  return new TypeTest_default({ prefix: "", namespaceURI: null, localName: "node()" });
}
function anyItemTest() {
  return new TypeTest_default({ prefix: "", namespaceURI: null, localName: "item()" });
}
function unionNodeTest(ast, compilationOptions) {
  const subTests = astHelper_default.getChildren(ast, "*").map((t4) => compileTest(t4, compilationOptions));
  if (subTests.length === 1) {
    return subTests[1];
  }
  return new UnionNodeTest_default(subTests);
}
function pathExpr(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  const rawSteps = astHelper_default.getChildren(ast, "stepExpr");
  let hasAxisStep = false;
  const steps = rawSteps.map((step) => {
    const axis = astHelper_default.getFirstChild(step, "xpathAxis");
    let stepExpression;
    const children = astHelper_default.getChildren(step, "*");
    const postFixExpressions = [];
    let intersectingBucket = null;
    let hasSeenNullBucket = false;
    for (const child of children) {
      switch (child[0]) {
        case "lookup":
          postFixExpressions.push(["lookup", compileLookup(child, compilationOptions)]);
          break;
        case "predicate":
        case "predicates":
          for (const childPredicate of astHelper_default.getChildren(child, "*")) {
            const predicateExpression = compile(
              childPredicate,
              disallowUpdating(compilationOptions)
            );
            if (!hasSeenNullBucket) {
              const predicateBucket = predicateExpression.getBucket();
              if (predicateBucket === null) {
                hasSeenNullBucket = true;
              } else {
                intersectingBucket = intersectBuckets(
                  intersectingBucket,
                  predicateBucket
                );
              }
            }
            postFixExpressions.push(["predicate", predicateExpression]);
          }
          break;
      }
    }
    if (axis) {
      hasAxisStep = true;
      const test = astHelper_default.getFirstChild(step, [
        "attributeTest",
        "anyElementTest",
        "piTest",
        "documentTest",
        "elementTest",
        "commentTest",
        "namespaceTest",
        "anyKindTest",
        "textTest",
        "anyFunctionTest",
        "typedFunctionTest",
        "schemaAttributeTest",
        "atomicType",
        "anyItemType",
        "parenthesizedItemType",
        "typedMapTest",
        "typedArrayTest",
        "nameTest",
        "Wildcard",
        "unionNodeTest"
      ]);
      const testExpressions = compileTest(test, disallowUpdating(compilationOptions));
      switch (astHelper_default.getTextContent(axis)) {
        case "ancestor":
          stepExpression = new AncestorAxis_default(testExpressions, { inclusive: false });
          break;
        case "ancestor-or-self":
          stepExpression = new AncestorAxis_default(testExpressions, { inclusive: true });
          break;
        case "attribute":
          stepExpression = new AttributeAxis_default(testExpressions, intersectingBucket);
          break;
        case "child":
          stepExpression = new ChildAxis_default(testExpressions, intersectingBucket);
          break;
        case "descendant":
          stepExpression = new DescendantAxis_default(testExpressions, { inclusive: false });
          break;
        case "descendant-or-self":
          stepExpression = new DescendantAxis_default(testExpressions, { inclusive: true });
          break;
        case "parent":
          stepExpression = new ParentAxis_default(testExpressions, intersectingBucket);
          break;
        case "following-sibling":
          stepExpression = new FollowingSiblingAxis_default(testExpressions, intersectingBucket);
          break;
        case "preceding-sibling":
          stepExpression = new PrecedingSiblingAxis_default(testExpressions, intersectingBucket);
          break;
        case "following":
          stepExpression = new FollowingAxis_default(testExpressions);
          break;
        case "preceding":
          stepExpression = new PrecedingAxis_default(testExpressions);
          break;
        case "self":
          stepExpression = new SelfAxis_default(testExpressions, intersectingBucket);
          break;
      }
    } else {
      const filterExpr = astHelper_default.followPath(step, ["filterExpr", "*"]);
      stepExpression = compile(filterExpr, disallowUpdating(compilationOptions));
    }
    for (const postfix of postFixExpressions) {
      switch (postfix[0]) {
        case "lookup":
          stepExpression = new Lookup_default(stepExpression, postfix[1]);
          break;
        case "predicate":
          stepExpression = new Filter_default(stepExpression, postfix[1]);
          break;
      }
    }
    stepExpression.type = type;
    return stepExpression;
  });
  const isAbsolute = astHelper_default.getFirstChild(ast, "rootExpr");
  const requireSorting = hasAxisStep || isAbsolute !== null || rawSteps.length > 1;
  if (!requireSorting && steps.length === 1) {
    return steps[0];
  }
  if (!isAbsolute && steps.length === 1 && steps[0].expectedResultOrder === "sorted" /* SORTED */) {
    return steps[0];
  }
  if (isAbsolute && steps.length === 0) {
    return new AbsolutePathExpression_default(null);
  }
  const pathExpression = new PathExpression_default(steps, requireSorting);
  if (isAbsolute) {
    return new AbsolutePathExpression_default(pathExpression);
  }
  return pathExpression;
}
function piTest(ast, _compilationOptions) {
  const piTarget2 = astHelper_default.getFirstChild(ast, "piTarget");
  if (piTarget2) {
    return new PITest_default(astHelper_default.getTextContent(piTarget2));
  }
  return new KindTest_default(7);
}
function commentTest(_ast, _compilationOptions) {
  return new KindTest_default(8);
}
function documentTest(_ast, _compilationOptions) {
  return new KindTest_default(9);
}
function elementTest(ast, _compilationOptions) {
  const elementName2 = astHelper_default.getFirstChild(ast, "elementName");
  const star = elementName2 && astHelper_default.getFirstChild(elementName2, "star");
  if (!elementName2 || star) {
    return new KindTest_default(1);
  }
  return new NameTest_default(astHelper_default.getQName(astHelper_default.getFirstChild(elementName2, "QName")), {
    kind: 1
  });
}
function attributeTest(ast, _compilationOptions) {
  const attributeName = astHelper_default.getFirstChild(ast, "attributeName");
  const star = attributeName && astHelper_default.getFirstChild(attributeName, "star");
  if (!attributeName || star) {
    return new KindTest_default(2);
  }
  return new NameTest_default(astHelper_default.getQName(astHelper_default.getFirstChild(attributeName, "QName")), {
    kind: 2
  });
}
function textTest(_ast, _compilationOptions) {
  return new KindTest_default(3);
}
function quantified(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  const quantifier = astHelper_default.getTextContent(astHelper_default.getFirstChild(ast, "quantifier"));
  const predicateExpr = astHelper_default.followPath(ast, ["predicateExpr", "*"]);
  const quantifierInClauses = astHelper_default.getChildren(ast, "quantifiedExprInClause").map((inClause) => {
    const name2 = astHelper_default.getQName(
      astHelper_default.followPath(inClause, ["typedVariableBinding", "varName"])
    );
    const sourceExpr = astHelper_default.followPath(inClause, ["sourceExpr", "*"]);
    return { name: name2, sourceExpr: compile(sourceExpr, disallowUpdating(compilationOptions)) };
  });
  return new QuantifiedExpression_default(
    quantifier,
    quantifierInClauses,
    compile(predicateExpr, disallowUpdating(compilationOptions)),
    type
  );
}
function sequence(ast, compilationOptions) {
  const childExpressions = astHelper_default.getChildren(ast, "*").map((arg) => compile(arg, compilationOptions));
  if (childExpressions.length === 1) {
    return childExpressions[0];
  }
  const type = astHelper_default.getAttribute(ast, "type");
  return new SequenceOperator_default(
    astHelper_default.getChildren(ast, "*").map((arg) => compile(arg, compilationOptions)),
    type
  );
}
function simpleMap(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  return astHelper_default.getChildren(ast, "*").reduce((lhs, rhs) => {
    if (lhs === null) {
      return compile(rhs, disallowUpdating(compilationOptions));
    }
    return new SimpleMapOperator_default(lhs, compile(rhs, disallowUpdating(compilationOptions)), type);
  }, null);
}
function stringConcatenateOp(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  const args = [
    astHelper_default.followPath(ast, ["firstOperand", "*"]),
    astHelper_default.followPath(ast, ["secondOperand", "*"])
  ];
  return new FunctionCall_default(
    new NamedFunctionRef_default(
      {
        localName: "concat",
        namespaceURI: "http://www.w3.org/2005/xpath-functions",
        prefix: ""
      },
      args.length,
      type
    ),
    args.map((arg) => compile(arg, disallowUpdating(compilationOptions))),
    type
  );
}
function rangeSequenceExpr(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  const args = [
    astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "startExpr"), "*"),
    astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "endExpr"), "*")
  ];
  const ref = new NamedFunctionRef_default(
    {
      localName: "to",
      namespaceURI: "http://fontoxpath/operators",
      prefix: ""
    },
    args.length,
    type
  );
  return new FunctionCall_default(
    ref,
    args.map((arg) => compile(arg, disallowUpdating(compilationOptions))),
    type
  );
}
function typeTest(ast, _compilationOptions) {
  const type = astHelper_default.getQName(ast);
  return new TypeTest_default(type);
}
function anyMapTest(_ast, _compilationOptions) {
  return new TypeTest_default({ prefix: "", namespaceURI: null, localName: "map(*)" });
}
function anyArrayTest(_ast, _compilationOptions) {
  return new TypeTest_default({ prefix: "", namespaceURI: null, localName: "array(*)" });
}
function unaryPlus(ast, compilationOptions) {
  const operand = astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "operand"), "*");
  const type = astHelper_default.getAttribute(ast, "type");
  return new Unary_default("+", compile(operand, compilationOptions), type);
}
function unaryMinus(ast, compilationOptions) {
  const operand = astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "operand"), "*");
  const type = astHelper_default.getAttribute(ast, "type");
  return new Unary_default("-", compile(operand, compilationOptions), type);
}
function unionOp(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  return new Union_default(
    [
      compile(
        astHelper_default.followPath(ast, ["firstOperand", "*"]),
        disallowUpdating(compilationOptions)
      ),
      compile(
        astHelper_default.followPath(ast, ["secondOperand", "*"]),
        disallowUpdating(compilationOptions)
      )
    ],
    type
  );
}
function otherwiseOp(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  return new Otherwise_default(
    [
      compile(
        astHelper_default.followPath(ast, ["firstOperand", "*"]),
        disallowUpdating(compilationOptions)
      ),
      compile(
        astHelper_default.followPath(ast, ["secondOperand", "*"]),
        disallowUpdating(compilationOptions)
      )
    ],
    type
  );
}
function intersectExcept(ast, compilationOptions) {
  const type = astHelper_default.getAttribute(ast, "type");
  return new IntersectExcept_default(
    ast[0],
    compile(
      astHelper_default.followPath(ast, ["firstOperand", "*"]),
      disallowUpdating(compilationOptions)
    ),
    compile(
      astHelper_default.followPath(ast, ["secondOperand", "*"]),
      disallowUpdating(compilationOptions)
    ),
    type
  );
}
function varRef(ast, _compilationOptions) {
  const { prefix: prefix2, namespaceURI, localName } = astHelper_default.getQName(
    astHelper_default.getFirstChild(ast, "name")
  );
  return new VarRef_default(prefix2, namespaceURI, localName);
}
function wildcard(ast, _compilationOptions) {
  if (!astHelper_default.getFirstChild(ast, "star")) {
    return new NameTest_default({
      localName: "*",
      namespaceURI: null,
      prefix: "*"
    });
  }
  const uri = astHelper_default.getFirstChild(ast, "uri");
  if (uri) {
    return new NameTest_default({
      localName: "*",
      namespaceURI: astHelper_default.getTextContent(uri),
      prefix: ""
    });
  }
  const ncName2 = astHelper_default.getFirstChild(ast, "NCName");
  if (astHelper_default.getFirstChild(ast, "*")[0] === "star") {
    return new NameTest_default({
      localName: astHelper_default.getTextContent(ncName2),
      namespaceURI: null,
      prefix: "*"
    });
  }
  return new NameTest_default({
    localName: "*",
    namespaceURI: null,
    prefix: astHelper_default.getTextContent(ncName2)
  });
}
function dirElementConstructor(ast, compilationOptions) {
  if (!compilationOptions.allowXQuery) {
    throw new Error("XPST0003: Use of XQuery functionality is not allowed in XPath context");
  }
  const name2 = astHelper_default.getQName(astHelper_default.getFirstChild(ast, "tagName"));
  const attList = astHelper_default.getFirstChild(ast, "attributeList");
  const attributes = attList ? astHelper_default.getChildren(attList, "attributeConstructor").map((attr) => compile(attr, disallowUpdating(compilationOptions))) : [];
  const namespaceDecls = attList ? astHelper_default.getChildren(attList, "namespaceDeclaration").map((namespaceDecl) => {
    const prefixElement = astHelper_default.getFirstChild(namespaceDecl, "prefix");
    return {
      prefix: prefixElement ? astHelper_default.getTextContent(prefixElement) : "",
      uri: astHelper_default.getTextContent(astHelper_default.getFirstChild(namespaceDecl, "uri"))
    };
  }) : [];
  const content = astHelper_default.getFirstChild(ast, "elementContent");
  const contentExpressions = content ? astHelper_default.getChildren(content, "*").map((child) => compile(child, disallowUpdating(compilationOptions))) : [];
  return new ElementConstructor_default(
    name2,
    attributes,
    namespaceDecls,
    contentExpressions
  );
}
function CDataSection(ast, _compilationOptions) {
  return new Literal_default(astHelper_default.getTextContent(ast), {
    type: 1 /* XSSTRING */,
    mult: 3 /* EXACTLY_ONE */
  });
}
function attributeConstructor(ast, compilationOptions) {
  if (!compilationOptions.allowXQuery) {
    throw new Error("XPST0003: Use of XQuery functionality is not allowed in XPath context");
  }
  const attrName = astHelper_default.getQName(astHelper_default.getFirstChild(ast, "attributeName"));
  const attrValueElement = astHelper_default.getFirstChild(ast, "attributeValue");
  const attrValue = attrValueElement ? astHelper_default.getTextContent(attrValueElement) : null;
  const attrValueExprElement = astHelper_default.getFirstChild(ast, "attributeValueExpr");
  const attrValueExpressions = attrValueExprElement ? astHelper_default.getChildren(attrValueExprElement, "*").map((expr) => compile(expr, disallowUpdating(compilationOptions))) : null;
  return new AttributeConstructor_default(attrName, {
    value: attrValue,
    valueExprParts: attrValueExpressions
  });
}
function computedAttributeConstructor(ast, compilationOptions) {
  const tagName = astHelper_default.getFirstChild(ast, "tagName");
  let name2;
  if (tagName) {
    name2 = astHelper_default.getQName(tagName);
  } else {
    const tagNameExpr = astHelper_default.getFirstChild(ast, "tagNameExpr");
    name2 = {
      expr: compile(
        astHelper_default.getFirstChild(tagNameExpr, "*"),
        disallowUpdating(compilationOptions)
      )
    };
  }
  const valueExpr = compile(
    astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "valueExpr"), "*"),
    disallowUpdating(compilationOptions)
  );
  return new AttributeConstructor_default(name2, {
    valueExprParts: [valueExpr]
  });
}
function computedCommentConstructor(ast, compilationOptions) {
  if (!compilationOptions.allowXQuery) {
    throw new Error("XPST0003: Use of XQuery functionality is not allowed in XPath context");
  }
  const argExpr = astHelper_default.getFirstChild(ast, "argExpr");
  const expr = argExpr ? compile(astHelper_default.getFirstChild(argExpr, "*"), disallowUpdating(compilationOptions)) : null;
  return new CommentConstructor_default(expr);
}
function computedTextConstructor(ast, compilationOptions) {
  if (!compilationOptions.allowXQuery) {
    throw new Error("XPST0003: Use of XQuery functionality is not allowed in XPath context");
  }
  const argExpr = astHelper_default.getFirstChild(ast, "argExpr");
  const expr = argExpr ? compile(astHelper_default.getFirstChild(argExpr, "*"), disallowUpdating(compilationOptions)) : null;
  return new TextConstructor_default(expr);
}
function computedElementConstructor(ast, compilationOptions) {
  const tagName = astHelper_default.getFirstChild(ast, "tagName");
  let name2;
  if (tagName) {
    name2 = astHelper_default.getQName(tagName);
  } else {
    const tagNameExpr = astHelper_default.getFirstChild(ast, "tagNameExpr");
    name2 = {
      expr: compile(
        astHelper_default.getFirstChild(tagNameExpr, "*"),
        disallowUpdating(compilationOptions)
      )
    };
  }
  const content = astHelper_default.getFirstChild(ast, "contentExpr");
  const contentExpressions = content ? astHelper_default.getChildren(content, "*").map((child) => compile(child, disallowUpdating(compilationOptions))) : [];
  return new ElementConstructor_default(name2, [], [], contentExpressions);
}
function computedPIConstructor(ast, compilationOptions) {
  if (!compilationOptions.allowXQuery) {
    throw new Error("XPST0003: Use of XQuery functionality is not allowed in XPath context");
  }
  const targetExpr = astHelper_default.getFirstChild(ast, "piTargetExpr");
  const target = astHelper_default.getFirstChild(ast, "piTarget");
  const piValueExpr = astHelper_default.getFirstChild(ast, "piValueExpr");
  const type = astHelper_default.getAttribute(ast, "type");
  return new PIConstructor_default(
    {
      targetExpr: targetExpr ? compile(
        astHelper_default.getFirstChild(targetExpr, "*"),
        disallowUpdating(compilationOptions)
      ) : null,
      targetValue: target ? astHelper_default.getTextContent(target) : null
    },
    piValueExpr ? compile(
      astHelper_default.getFirstChild(piValueExpr, "*"),
      disallowUpdating(compilationOptions)
    ) : new SequenceOperator_default([], type)
  );
}
function deleteExpression(ast, compilationOptions) {
  const targetExpr = compile(astHelper_default.followPath(ast, ["targetExpr", "*"]), compilationOptions);
  return new DeleteExpression_default(targetExpr);
}
function insertExpression(ast, compilationOptions) {
  const sourceExpr = compile(astHelper_default.followPath(ast, ["sourceExpr", "*"]), compilationOptions);
  let targetChoice;
  const insertTargetChoice = astHelper_default.getChildren(ast, "*")[1];
  switch (insertTargetChoice[0]) {
    case "insertAfter":
      targetChoice = 1 /* INSERT_AFTER */;
      break;
    case "insertBefore":
      targetChoice = 2 /* INSERT_BEFORE */;
      break;
    case "insertInto": {
      const insertAfterChoice = astHelper_default.getFirstChild(insertTargetChoice, "*");
      if (insertAfterChoice) {
        targetChoice = insertAfterChoice[0] === "insertAsFirst" ? 4 /* INSERT_INTO_AS_FIRST */ : 5 /* INSERT_INTO_AS_LAST */;
      } else {
        targetChoice = 3 /* INSERT_INTO */;
      }
      break;
    }
  }
  const targetExpr = compile(astHelper_default.followPath(ast, ["targetExpr", "*"]), compilationOptions);
  return new InsertExpression_default(sourceExpr, targetChoice, targetExpr);
}
function renameExpression(ast, compilationOptions) {
  const targetExpr = compile(astHelper_default.followPath(ast, ["targetExpr", "*"]), compilationOptions);
  const newNameExpr = compile(
    astHelper_default.followPath(ast, ["newNameExpr", "*"]),
    compilationOptions
  );
  return new RenameExpression_default(targetExpr, newNameExpr);
}
function replaceExpression(ast, compilationOptions) {
  const isReplaceValue = !!astHelper_default.getFirstChild(ast, "replaceValue");
  const targetExpr = compile(astHelper_default.followPath(ast, ["targetExpr", "*"]), compilationOptions);
  const replacementExpr = compile(
    astHelper_default.followPath(ast, ["replacementExpr", "*"]),
    compilationOptions
  );
  return new ReplaceExpression_default(isReplaceValue, targetExpr, replacementExpr);
}
function transformExpression(ast, compilationOptions) {
  const transformCopies = astHelper_default.getChildren(astHelper_default.getFirstChild(ast, "transformCopies"), "transformCopy").map((transformCopy) => {
    const varName2 = astHelper_default.getQName(
      astHelper_default.getFirstChild(astHelper_default.getFirstChild(transformCopy, "varRef"), "name")
    );
    const sourceExpr = compile(
      astHelper_default.getFirstChild(astHelper_default.getFirstChild(transformCopy, "copySource"), "*"),
      compilationOptions
    );
    return {
      sourceExpr,
      varRef: new QName_default(varName2.prefix, varName2.namespaceURI, varName2.localName)
    };
  });
  const modifyExpr = compile(
    astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "modifyExpr"), "*"),
    compilationOptions
  );
  const returnExpr = compile(
    astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "returnExpr"), "*"),
    compilationOptions
  );
  return new TransformExpression_default(transformCopies, modifyExpr, returnExpr);
}
function typeswitchExpr(ast, compilationOptions) {
  if (!compilationOptions.allowXQuery) {
    throw new Error("XPST0003: Use of XQuery functionality is not allowed in XPath context");
  }
  const type = astHelper_default.getAttribute(ast, "type");
  const argExpr = compile(
    astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "argExpr"), "*"),
    compilationOptions
  );
  const caseClause = astHelper_default.getChildren(ast, "typeswitchExprCaseClause");
  const caseClauseExpressions = caseClause.map((caseClauseExpression) => {
    const caseNodes = astHelper_default.getChildren(caseClauseExpression, "sequenceTypeUnion").length === 0 ? [astHelper_default.getFirstChild(caseClauseExpression, "sequenceType")] : astHelper_default.getChildren(
      astHelper_default.getFirstChild(caseClauseExpression, "sequenceTypeUnion"),
      "sequenceType"
    );
    const resultExpression = compile(
      astHelper_default.followPath(caseClauseExpression, ["resultExpr", "*"]),
      compilationOptions
    );
    return {
      caseClauseExpression: resultExpression,
      typeTests: caseNodes.map((sequenceTypeAstNode) => {
        const occurrenceIndicator2 = astHelper_default.getFirstChild(
          sequenceTypeAstNode,
          "occurrenceIndicator"
        );
        return {
          occurrenceIndicator: occurrenceIndicator2 ? astHelper_default.getTextContent(occurrenceIndicator2) : "",
          typeTest: compile(
            astHelper_default.getFirstChild(sequenceTypeAstNode, "*"),
            compilationOptions
          )
        };
      })
    };
  });
  const defaultExpression = compile(
    astHelper_default.followPath(ast, ["typeswitchExprDefaultClause", "resultExpr", "*"]),
    compilationOptions
  );
  return new TypeSwitchExpression_default(argExpr, caseClauseExpressions, defaultExpression, type);
}
function switchExpr(ast, compilationOptions) {
  if (!compilationOptions.allowXQuery) {
    throw new Error("XPST0003: Use of XQuery functionality is not allowed in XPath context");
  }
  const type = astHelper_default.getAttribute(ast, "type");
  const argExpr = compile(
    astHelper_default.getFirstChild(astHelper_default.getFirstChild(ast, "argExpr"), "*"),
    compilationOptions
  );
  const caseClauses = astHelper_default.getChildren(ast, "switchExprCaseClause");
  const caseClauseExpressions = caseClauses.map((caseClauseExpression) => {
    const caseNodes = astHelper_default.getChildren(caseClauseExpression, "switchCaseExpr");
    const resultExpression = compile(
      astHelper_default.followPath(caseClauseExpression, ["resultExpr", "*"]),
      compilationOptions
    );
    return {
      caseClauseExpression: resultExpression,
      tests: caseNodes.map(
        (caseNode) => compile(astHelper_default.getFirstChild(caseNode, "*"), compilationOptions)
      )
    };
  });
  const defaultExpression = compile(
    astHelper_default.followPath(ast, ["switchExprDefaultClause", "resultExpr", "*"]),
    compilationOptions
  );
  return new SwitchExpression_default(argExpr, caseClauseExpressions, defaultExpression, type);
}
function compileAstToExpression_default(xPathAst, compilationOptions) {
  return compile(xPathAst, compilationOptions);
}

// ../gh/fontoxpath/src/parsing/compiledExpressionCache.ts
var compiledExpressionCache = /* @__PURE__ */ new Map();
var CacheEntry = class {
  constructor(referredNamespaces, referredVariables, compiledExpression, moduleImports, defaultFunctionNamespaceURI, resolvedFunctions) {
    this.referredNamespaces = referredNamespaces;
    this.referredVariables = referredVariables;
    this.compiledExpression = compiledExpression;
    this.moduleImports = moduleImports;
    this.defaultFunctionNamespaceURI = defaultFunctionNamespaceURI;
    this.resolvedFunctions = resolvedFunctions;
  }
};
function generateLanguageKey(language, debug) {
  return language + (debug ? "_DEBUG" : "");
}
function getAnyStaticCompilationResultFromCache(selectorExpression, language, debug) {
  const cachesForExpression = compiledExpressionCache.get(selectorExpression);
  if (!cachesForExpression) {
    return null;
  }
  if (language === null) {
    for (const lang of Object.keys(cachesForExpression)) {
      if (cachesForExpression[lang] && cachesForExpression[lang].length) {
        return cachesForExpression[lang][0].compiledExpression;
      }
    }
    return null;
  }
  const languageKey = language && generateLanguageKey(language, debug);
  const cachesForLanguage = cachesForExpression[languageKey];
  if (!cachesForLanguage || cachesForLanguage.length === 0) {
    return null;
  }
  return cachesForLanguage[0].compiledExpression;
}
function getStaticCompilationResultFromCache(selectorExpression, language, namespaceResolver, variables, moduleImports, debug, defaultFunctionNamespaceURI, functionNameResolver) {
  const cachesForExpression = compiledExpressionCache.get(selectorExpression);
  if (!cachesForExpression) {
    return null;
  }
  const languageKey = generateLanguageKey(language, debug);
  const cachesForLanguage = cachesForExpression[languageKey];
  if (!cachesForLanguage) {
    return null;
  }
  const cacheWithCorrectContext = cachesForLanguage.find(
    (cache) => cache.defaultFunctionNamespaceURI === defaultFunctionNamespaceURI && cache.referredNamespaces.every(
      (nsRef) => namespaceResolver(nsRef.prefix) === nsRef.namespaceURI
    ) && cache.referredVariables.every((varRef3) => variables[varRef3.name] !== void 0) && cache.moduleImports.every(
      (moduleImport) => moduleImports[moduleImport.prefix] === moduleImport.namespaceURI
    ) && cache.resolvedFunctions.every((resolvedFunction) => {
      const newResolvedFunction = functionNameResolver(
        resolvedFunction.lexicalQName,
        resolvedFunction.arity
      );
      return newResolvedFunction && newResolvedFunction.namespaceURI === resolvedFunction.resolvedQName.namespaceURI && newResolvedFunction.localName === resolvedFunction.resolvedQName.localName;
    })
  );
  if (!cacheWithCorrectContext) {
    return null;
  }
  return {
    expression: cacheWithCorrectContext.compiledExpression,
    requiresStaticCompilation: false
  };
}
function storeStaticCompilationResultInCache(selectorExpression, language, executionStaticContext, moduleImports, compiledExpression, debug, defaultFunctionNamespaceURI) {
  let cachesForExpression = compiledExpressionCache.get(selectorExpression);
  if (!cachesForExpression) {
    cachesForExpression = /* @__PURE__ */ Object.create(null);
    compiledExpressionCache.set(selectorExpression, cachesForExpression);
  }
  const languageKey = generateLanguageKey(language, debug);
  let cachesForLanguage = cachesForExpression[languageKey];
  if (!cachesForLanguage) {
    cachesForLanguage = cachesForExpression[languageKey] = [];
  }
  cachesForLanguage.push(
    new CacheEntry(
      executionStaticContext.getReferredNamespaces(),
      executionStaticContext.getReferredVariables(),
      compiledExpression,
      Object.keys(moduleImports).map((moduleImportPrefix) => ({
        namespaceURI: moduleImports[moduleImportPrefix],
        prefix: moduleImportPrefix
      })),
      defaultFunctionNamespaceURI,
      executionStaticContext.getResolvedFunctions()
    )
  );
}

// ../gh/fontoxpath/src/parsing/convertXmlToAst.ts
function convertXmlToAst(element) {
  const domFacade2 = new ExternalDomFacade();
  if (element.namespaceURI !== "http://www.w3.org/2005/XQueryX" /* XQUERYX_NAMESPACE_URI */ && element.namespaceURI !== "http://www.w3.org/2005/XQueryX" /* XQUERYX_NAMESPACE_URI */ && // We added the stacktrace nodes in our own namespace
  element.namespaceURI !== "http://fontoxml.com/fontoxpath" /* FONTOXPATH_NAMESPACE_URI */ && element.namespaceURI !== "http://www.w3.org/2007/xquery-update-10" /* XQUERYX_UPDATING_NAMESPACE_URI */) {
    throw errXPTY0004("The XML structure passed as an XQueryX program was not valid XQueryX");
  }
  const ast = [element.localName === "stackTrace" ? "x:stackTrace" : element.localName];
  const attributes = domFacade2.getAllAttributes(element);
  if (attributes && attributes.length > 0) {
    ast.push(
      Array.from(attributes).reduce((attrs, attr) => {
        if ((attr.localName === "comment" || attr.localName === "start" || attr.localName === "end") && element.localName === "stackTrace") {
          attrs[attr.localName] = JSON.parse(attr.value);
        } else if (attr.localName === "type") {
          attrs[attr.localName] = stringToSequenceType(attr.value);
        } else {
          attrs[attr.localName] = attr.value;
        }
        return attrs;
      }, {})
    );
  }
  const childNodes = domFacade2.getChildNodes(element);
  for (const child of childNodes) {
    switch (child.nodeType) {
      case 1 /* ELEMENT_NODE */:
        ast.push(convertXmlToAst(child));
        break;
      case 3 /* TEXT_NODE */:
        ast.push(child.data);
    }
  }
  return ast;
}

// ../gh/fontoxpath/src/parsing/globalModuleCache.ts
var loadedModulesByNamespaceURI = /* @__PURE__ */ Object.create(null);
var loadModuleFile = (uri, moduleContents) => {
  let loadedModuleContents = loadedModulesByNamespaceURI[uri];
  if (!loadedModuleContents) {
    loadedModuleContents = loadedModulesByNamespaceURI[uri] = {
      functionDeclarations: [],
      variableDeclarations: [],
      performStaticAnalysis: null,
      source: moduleContents.source
    };
  }
  const staticallyAnalyseEarlierModules = loadedModuleContents.performStaticAnalysis || (() => {
  });
  loadedModuleContents.functionDeclarations = loadedModuleContents.functionDeclarations.concat(
    moduleContents.functionDeclarations
  );
  loadedModuleContents.variableDeclarations = loadedModuleContents.variableDeclarations.concat(
    moduleContents.variableDeclarations
  );
  loadedModuleContents.performStaticAnalysis = (m2) => {
    staticallyAnalyseEarlierModules(m2);
    if (moduleContents.performStaticAnalysis) {
      moduleContents.performStaticAnalysis(m2);
    }
  };
};
var enhanceStaticContextWithModule = (staticContext, uri) => {
  const moduleContents = loadedModulesByNamespaceURI[uri];
  if (!moduleContents) {
    throw new Error(`XQST0051: No modules found with the namespace uri ${uri}`);
  }
  moduleContents.functionDeclarations.forEach((functionDeclaration) => {
    if (functionDeclaration.isPublic) {
      staticContext.registerFunctionDefinition(
        uri,
        functionDeclaration.localName,
        functionDeclaration.arity,
        functionDeclaration
      );
    }
  });
  moduleContents.variableDeclarations.forEach((variableDeclaration) => {
    staticContext.registerVariable(uri, variableDeclaration.localName);
    staticContext.registerVariableDeclaration(
      uri,
      variableDeclaration.localName,
      (dynamicContext, executionParameters) => variableDeclaration.expression.evaluateMaybeStatically(
        dynamicContext,
        executionParameters
      )
    );
  });
};
var performStaticCompilationOnModules = () => {
  Object.keys(loadedModulesByNamespaceURI).forEach((namespaceURI) => {
    const moduleContents = loadedModulesByNamespaceURI[namespaceURI];
    if (moduleContents.performStaticAnalysis) {
      try {
        moduleContents.performStaticAnalysis(moduleContents);
      } catch (error) {
        moduleContents.performStaticAnalysis = null;
        printAndRethrowError(moduleContents.source, error);
      }
    }
    moduleContents.performStaticAnalysis = null;
  });
};

// ../gh/fontoxpath/src/parsing/normalizeEndOfLines.ts
function normalizeEndOfLines(xpathString) {
  return xpathString.replace(/(\x0D\x0A)|(\x0D(?!\x0A))/g, String.fromCharCode(10));
}

// node_modules/prsc/dist/prsc.esm.js
function n3(n4, t4) {
  return { success: true, offset: n4, value: t4 };
}
function t3(t4) {
  return n3(t4, void 0);
}
function e3(n4, t4, e4 = false) {
  return { success: false, offset: n4, expected: t4, fatal: e4 };
}
function r3(t4) {
  return (r4, u3) => {
    const o3 = u3 + t4.length;
    return r4.slice(u3, o3) === t4 ? n3(o3, t4) : e3(u3, [t4]);
  };
}
function i3(t4, e4) {
  return (r4, u3) => {
    const o3 = t4(r4, u3);
    return o3.success ? n3(o3.offset, e4(o3.value)) : o3;
  };
}
function a3(n4, t4, r4, u3) {
  return (o3, c3) => {
    const f3 = n4(o3, c3);
    return f3.success ? t4(f3.value) ? f3 : e3(c3, r4, u3) : f3;
  };
}
function d3(n4, t4) {
  return (r4, u3) => {
    let o3 = null;
    for (const e4 of n4) {
      const n5 = e4(r4, u3);
      if (n5.success) return n5;
      if (null === o3 || n5.offset > o3.offset ? o3 = n5 : n5.offset === o3.offset && void 0 === t4 && (o3.expected = o3.expected.concat(n5.expected)), n5.fatal) return n5;
    }
    return t4 = t4 || (null == o3 ? void 0 : o3.expected) || [], o3 && (o3.expected = t4), o3 || e3(u3, t4);
  };
}
function v2(t4) {
  return (e4, r4) => {
    const u3 = t4(e4, r4);
    return u3.success || u3.fatal ? u3 : n3(r4, null);
  };
}
function p2(t4) {
  return (e4, r4) => {
    let u3 = [], o3 = r4;
    for (; ; ) {
      const n4 = t4(e4, o3);
      if (!n4.success) {
        if (n4.fatal) return n4;
        break;
      }
      if (u3.push(n4.value), n4.offset === o3) break;
      o3 = n4.offset;
    }
    return n3(o3, u3);
  };
}
function b2(t4, e4, r4) {
  return (u3, o3) => {
    const c3 = t4(u3, o3);
    if (!c3.success) return c3;
    const f3 = e4(u3, c3.offset);
    return f3.success ? n3(f3.offset, r4(c3.value, f3.value)) : f3;
  };
}
function P2(n4) {
  return b2(n4, p2(n4), (n5, t4) => [n5].concat(t4));
}
function g2(n4, t4) {
  return n4;
}
function A(n4, t4) {
  return t4;
}
function C2(n4, t4) {
  return b2(n4, t4, A);
}
function S2(n4, t4) {
  return b2(n4, t4, g2);
}
function $2(n4, t4, e4, r4 = false) {
  return C2(n4, r4 ? D2(S2(t4, e4)) : S2(t4, e4));
}
function q2(t4) {
  return (e4, r4) => {
    const u3 = t4(e4, r4);
    return u3.success ? n3(r4, u3.value) : u3;
  };
}
function w3(n4, r4) {
  return (u3, o3) => n4(u3, o3).success ? e3(o3, r4) : t3(o3);
}
function D2(n4) {
  return (t4, r4) => {
    const u3 = n4(t4, r4);
    return u3.success ? u3 : e3(u3.offset, u3.expected, true);
  };
}
var F2 = (n4, r4) => n4.length === r4 ? t3(r4) : e3(r4, ["end of input"]);
function G2(n4) {
  return b2(n4, F2, g2);
}

// ../gh/fontoxpath/src/parsing/parsingFunctions.ts
function cached(parser, cache) {
  return (input, offset) => {
    if (cache.has(offset)) {
      return cache.get(offset);
    }
    const result = parser(input, offset);
    cache.set(offset, result);
    return result;
  };
}
function surrounded(parser, around) {
  return $2(around, parser, around);
}
function precededMultiple(before, parser) {
  return before.reverse().reduce((prev, curr) => C2(curr, prev), parser);
}
function then3(aParser, bParser, cParser, func) {
  return b2(
    b2(aParser, bParser, (a4, b3) => [a4, b3]),
    cParser,
    ([a4, b3], c3) => func(a4, b3, c3)
  );
}
function then4(aParser, bParser, cParser, dParser, func) {
  return b2(
    b2(
      b2(aParser, bParser, (a4, b3) => [a4, b3]),
      cParser,
      ([a4, b3], c3) => [a4, b3, c3]
    ),
    dParser,
    ([a4, b3, c3], d4) => func(a4, b3, c3, d4)
  );
}
function then5(aParser, bParser, cParser, dParser, eParser, func) {
  return b2(
    b2(
      b2(
        b2(aParser, bParser, (a4, b3) => [a4, b3]),
        cParser,
        ([a4, b3], c3) => [a4, b3, c3]
      ),
      dParser,
      ([a4, b3, c3], d4) => [a4, b3, c3, d4]
    ),
    eParser,
    ([a4, b3, c3, d4], e4) => func(a4, b3, c3, d4, e4)
  );
}
function wrapArray(parser) {
  return i3(parser, (x2) => [x2]);
}
function alias(tokenNames, aliasedName) {
  return i3(d3(tokenNames), (_2) => aliasedName);
}
function regex(reg) {
  return (input, offset) => {
    const match = reg.exec(input.substring(offset));
    return match && match.index === 0 ? n3(offset + match[0].length, match[0]) : e3(offset, [reg.source], false);
  };
}

// ../gh/fontoxpath/src/parsing/tokens.ts
var WHITESPACE = d3([r3(" "), r3("	"), r3("\r"), r3("\n")]);
var COMMENT_START = r3("(:");
var COMMENT_END = r3(":)");
var PRAGMA_START = r3("(#");
var PRAGMA_END = r3("#)");
var BRACE_OPEN = r3("(");
var BRACE_CLOSE = r3(")");
var BRACKET_OPEN = r3("[");
var BRACKET_CLOSE = r3("]");
var CURLY_BRACE_OPEN = r3("{");
var CURLY_BRACE_CLOSE = r3("}");
var CURLY_BRACE_OPEN_DOUBLE = r3("{{");
var CURLY_BRACE_CLOSE_DOUBLE = r3("}}");
var SINGLE_QUOTE = r3("'");
var SINGLE_QUOTE_DOUBLE = r3("''");
var DOUBLE_QUOTE = r3('"');
var DOUBLE_QUOTE_DOUBLE = r3('""');
var CDATA_OPEN = r3("<![CDATA[");
var CDATA_CLOSE = r3("]]>");
var DIR_ELEM_CLOSE = r3("/>");
var DIR_ELEM_OPEN_CONTENT = r3("</");
var DIR_COMMENT_OPEN = r3("<!--");
var DIR_COMMENT_CLOSE = r3("-->");
var DIR_PI_OPEN = r3("<?");
var DIR_PI_CLOSE = r3("?>");
var CHAR_REF_HEX = r3("&#x");
var CHAR_REF = r3("&#");
var COLON_ASTERIX = r3(":*");
var ASTERIX_COLON = r3("*:");
var WALRUS = r3(":=");
var AMPERSAND = r3("&");
var COLON = r3(":");
var SEMICOLON = r3(";");
var ASTERIX = r3("*");
var AT_SIGN = r3("@");
var DOLLAR = r3("$");
var HASHTAG = r3("#");
var PERCENT = r3("%");
var QUESTION_MARK = r3("?");
var EQUALS = r3("=");
var EXCLAMATION_MARK = S2(r3("!"), w3(q2(EQUALS), []));
var VERTICAL_BAR = S2(r3("|"), w3(q2(r3("|")), []));
var VERTICAL_BAR_DOUBLE = r3("||");
var NOT_EQUALS = r3("!=");
var LESS_THAN = r3("<");
var LESS_THAN_DOUBLE = r3("<<");
var LESS_THAN_EQUALS = r3("<=");
var GREATER_THAN = r3(">");
var GREATER_THAN_DOUBLE = r3(">>");
var GREATER_THAN_EQUALS = r3(">=");
var COMMA = r3(",");
var DOT = r3(".");
var DOUBLE_DOT = r3("..");
var PLUS = r3("+");
var MINUS = r3("-");
var SLASH = r3("/");
var DOUBLE_SLASH = r3("//");
var ARROW = r3("=>");
var E_LOWER = r3("e");
var E_UPPER = r3("E");
var L_LOWER = r3("l");
var L_UPPER = r3("L");
var M_LOWER = r3("m");
var M_UPPER = r3("M");
var Q_UPPER = r3("Q");
var X_LOWER = r3("x");
var X_UPPER = r3("X");
var AS = r3("as");
var CAST = r3("cast");
var CASTABLE = r3("castable");
var TREAT = r3("treat");
var INSTANCE = r3("instance");
var OF = r3("of");
var NODE = r3("node");
var NODES = r3("nodes");
var DELETE = r3("delete");
var VALUE = r3("value");
var FUNCTION = r3("function");
var MAP = r3("map");
var ELEMENT = r3("element");
var ATTRIBUTE = r3("attribute");
var SCHEMA_ELEMENT = r3("schema-element");
var INTERSECT = r3("intersect");
var EXCEPT = r3("except");
var UNION = r3("union");
var OTHERWISE = r3("otherwise");
var TO = r3("to");
var IS = r3("is");
var OR = r3("or");
var AND = r3("and");
var DIV = r3("div");
var IDIV = r3("idiv");
var MOD = r3("mod");
var EQ = r3("eq");
var NE = r3("ne");
var LT = r3("lt");
var LE = r3("le");
var GT = r3("gt");
var GE = r3("ge");
var AMP = r3("amp");
var QUOT = r3("quot");
var APOS = r3("apos");
var IF = r3("if");
var THEN = r3("then");
var ELSE = r3("else");
var ALLOWING = r3("allowing");
var EMPTY = r3("empty");
var AT = r3("at");
var IN = r3("in");
var FOR = r3("for");
var LET = r3("let");
var WHERE = r3("where");
var COLLATION = r3("collation");
var GROUP = r3("group");
var BY = r3("by");
var ORDER = r3("order");
var STABLE = r3("stable");
var RETURN = r3("return");
var ARRAY = r3("array");
var DOCUMENT = r3("document");
var NAMESPACE = r3("namespace");
var TEXT = r3("text");
var COMMENT = r3("comment");
var PROCESSING_INSTRUCTION = r3("processing-instruction");
var LAX = r3("lax");
var STRICT = r3("strict");
var VALIDATE = r3("validate");
var TYPE = r3("type");
var DECLARE = r3("declare");
var DEFAULT = r3("default");
var BOUNDARY_SPACE = r3("boundary-space");
var STRIP = r3("strip");
var PRESERVE = r3("preserve");
var NO_PRESERVE = r3("no-preserve");
var INHERIT = r3("inherit");
var NO_INHERIT = r3("no-inherit");
var GREATEST = r3("greatest");
var LEAST = r3("least");
var COPY_NAMESPACES = r3("copy-namespaces");
var DECIMAL_FORMAT = r3("decimal-format");
var CASE = r3("case");
var TYPESWITCH = r3("typeswitch");
var SOME = r3("some");
var EVERY = r3("every");
var SATISFIES = r3("satisfies");
var REPLACE = r3("replace");
var WITH = r3("with");
var COPY = r3("copy");
var MODIFY = r3("modify");
var FIRST = r3("first");
var LAST = r3("last");
var BEFORE = r3("before");
var AFTER = r3("after");
var INTO = r3("into");
var INSERT = r3("insert");
var RENAME = r3("rename");
var SWITCH = r3("switch");
var VARIABLE = r3("variable");
var EXTERNAL = r3("external");
var UPDATING = r3("updating");
var IMPORT = r3("import");
var SCHEMA = r3("schema");
var MODULE = r3("module");
var BASE_URI = r3("base-uri");
var CONSTRUCTION = r3("construction");
var ORDERING = r3("ordering");
var ORDERED = r3("ordered");
var UNORDERED = r3("unordered");
var OPTION = r3("option");
var CONTEXT = r3("context");
var ITEM = r3("item");
var XQUERY = r3("xquery");
var VERSION2 = r3("version");
var ENCODING = r3("encoding");
var DOCUMENT_NODE = r3("document-node");
var NAMESPACE_NODE = r3("namespace-node");
var SCHEMA_ATTRIBUTE = r3("schema-attribute");
var ASCENDING = r3("ascending");
var DESCENDING = r3("descending");
var EMPTY_SEQUENCE = r3("empty-sequence");
var CHILD_AXIS = r3("child::");
var DESCENDANT_AXIS = r3("descendant::");
var ATTRIBUTE_AXIS = r3("attribute::");
var SELF_AXIS = r3("self::");
var DESCENDANT_OR_SELF_AXIS = r3("descendant-or-self::");
var FOLLOWING_SIBLING_AXIS = r3("following-sibling::");
var FOLLOWING_AXIS = r3("following::");
var PARENT_AXIS = r3("parent::");
var ANCESTOR_AXIS = r3("ancestor::");
var PRECEDING_SIBLING_AXIS = r3("preceding-sibling::");
var PRECEDING_AXIS = r3("preceding::");
var ANCESTOR_OR_SELF_AXIS = r3("ancestor-or-self::");
var DECIMAL_SEPARATOR = r3("decimal-separator");
var GROUPING_SEPARATOR = r3("grouping-separator");
var INFINITY = r3("infinity");
var MINUS_SIGN = r3("minus-sign");
var NAN = r3("NaN");
var PER_MILLE = r3("per-mille");
var ZERO_DIGIT = r3("zero-digit");
var DIGIT = r3("digit");
var PATTERN_SEPARATOR = r3("pattern-separator");
var EXPONENT_SEPARATOER = r3("exponent-separator");
var SCHEMA_ATTRIBUTE_OPEN = r3("schema-attribute(");
var DOCUMENT_NODE_OPEN = r3("document-node(");
var PROCESSING_INSTRUCTION_OPEN = r3("processing-instruction(");
var PROCESSING_INSTRUCTION_TEST = r3("processing-instruction()");
var COMMENT_TEST = r3("comment()");
var TEXT_TEST = r3("text()");
var NAMESPACE_NODE_TEST = r3("namespace-node()");
var ANY_KIND_TEST = r3("node()");
var ITEM_TYPE_TEST = r3("item()");
var EMPTY_SEQUENCE_TEST = r3("empty-sequence()");
var BACKTICK = r3("`");
var STRING_CONSTRUCTOR_OPEN = r3("``[");
var STRING_CONSTRUCTOR_CLOSE = r3("]``");
var STRING_INTERPOLATION_OPEN = r3("`{");
var STRING_INTERPOLATION_CLOSE = r3("}`");

// ../gh/fontoxpath/src/parsing/whitespaceParser.ts
var whitespaceCache = /* @__PURE__ */ new Map();
var whitespacePlusCache = /* @__PURE__ */ new Map();
var char = d3([
  regex(/[\t\n\r -\uD7FF\uE000\uFFFD]/),
  regex(/[\uD800-\uDBFF][\uDC00-\uDFFF]/)
]);
var commentContents = C2(
  q2(
    w3(d3([COMMENT_START, COMMENT_END]), [
      'comment contents cannot contain "(:" or ":)"'
    ])
  ),
  char
);
function commentIndirect(input, offset) {
  return comment(input, offset);
}
var comment = i3(
  $2(
    COMMENT_START,
    p2(d3([commentContents, commentIndirect])),
    COMMENT_END,
    true
  ),
  (x2) => x2.join("")
);
var whitespaceCharacter = d3([WHITESPACE, comment]);
var explicitWhitespace = i3(P2(WHITESPACE), (x2) => x2.join(""));
var whitespace = cached(
  i3(p2(whitespaceCharacter), (x2) => x2.join("")),
  whitespaceCache
);
var whitespacePlus = cached(
  i3(P2(whitespaceCharacter), (x2) => x2.join("")),
  whitespacePlusCache
);

// ../gh/fontoxpath/src/parsing/nameParser.ts
var ncNameStartChar = d3([
  regex(
    /[A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/
  ),
  b2(regex(/[\uD800-\uDB7F]/), regex(/[\uDC00-\uDFFF]/), (a4, b3) => a4 + b3)
]);
var ncNameChar = d3([
  ncNameStartChar,
  regex(/[\-\.0-9\xB7\u0300-\u036F\u203F\u2040]/)
]);
var ncName = b2(
  ncNameStartChar,
  p2(ncNameChar),
  (a4, b3) => a4 + b3.join("")
);
var prefix = i3(ncName, (x2) => ["prefix", x2]);
var nameStartChar = d3([ncNameStartChar, COLON]);
var nameChar = d3([ncNameChar, COLON]);
var name = b2(
  nameStartChar,
  p2(nameChar),
  (start, rest) => start + rest.join("")
);
var localPart = ncName;
var unprefixedName = i3(localPart, (x2) => [
  { ["prefix"]: "", ["URI"]: null },
  x2
]);
var xmlPrefix = ncName;
var prefixedName = b2(
  xmlPrefix,
  C2(COLON, localPart),
  (prefixPart, local) => [{ ["prefix"]: prefixPart, ["URI"]: null }, local]
);
var qName = d3([prefixedName, unprefixedName]);
var bracedURILiteral = S2(
  precededMultiple(
    [Q_UPPER, whitespace, CURLY_BRACE_OPEN],
    i3(p2(regex(/[^{}]/)), (x2) => x2.join("").replace(/\s+/g, " ").trim())
  ),
  CURLY_BRACE_CLOSE
);
var uriQualifiedName = b2(
  bracedURILiteral,
  ncName,
  (uri, localName) => [uri, localName]
);
var eqName = d3([
  i3(uriQualifiedName, (x2) => [{ ["prefix"]: null, ["URI"]: x2[0] }, x2[1]]),
  qName
]);
var elementName = eqName;
var elementNameOrWildCard = d3([
  i3(elementName, (qname) => ["QName", ...qname]),
  i3(ASTERIX, (_2) => ["star"])
]);
var varName = eqName;
var varRef2 = i3(C2(DOLLAR, varName), (x2) => [
  "varRef",
  ["name", ...x2]
]);

// ../gh/fontoxpath/src/parsing/literalParser.ts
var assertAdjacentOpeningTerminal = q2(
  d3([BRACE_OPEN, DOUBLE_QUOTE, SINGLE_QUOTE, whitespaceCharacter])
);
var forwardAxis = i3(
  d3([
    CHILD_AXIS,
    DESCENDANT_AXIS,
    ATTRIBUTE_AXIS,
    SELF_AXIS,
    DESCENDANT_OR_SELF_AXIS,
    FOLLOWING_SIBLING_AXIS,
    FOLLOWING_AXIS
  ]),
  (x2) => x2.substring(0, x2.length - 2)
);
var reverseAxis = i3(
  d3([
    PARENT_AXIS,
    ANCESTOR_AXIS,
    PRECEDING_SIBLING_AXIS,
    PRECEDING_AXIS,
    ANCESTOR_OR_SELF_AXIS
  ]),
  (x2) => x2.substring(0, x2.length - 2)
);
var predefinedEntityRef = then3(
  AMPERSAND,
  d3([LT, GT, AMP, QUOT, APOS]),
  SEMICOLON,
  (a4, b3, c3) => a4 + b3 + c3
);
var charRef = d3([
  then3(CHAR_REF_HEX, regex(/[0-9a-fA-F]+/), SEMICOLON, (a4, b3, c3) => a4 + b3 + c3),
  then3(CHAR_REF, regex(/[0-9]+/), SEMICOLON, (a4, b3, c3) => a4 + b3 + c3)
]);
var escapeQuot = alias([DOUBLE_QUOTE_DOUBLE], '"');
var escapeApos = alias([SINGLE_QUOTE_DOUBLE], "'");
var commentTest2 = wrapArray(alias([COMMENT_TEST], "commentTest"));
var textTest2 = wrapArray(alias([TEXT_TEST], "textTest"));
var namespaceNodeTest = wrapArray(
  alias([NAMESPACE_NODE_TEST], "namespaceTest")
);
var anyKindTest2 = wrapArray(alias([ANY_KIND_TEST], "anyKindTest"));
var digits = regex(/[0-9]+/);
var doubleLiteral = b2(
  d3([
    b2(DOT, digits, (dot, digitsParsed) => dot + digitsParsed),
    b2(
      digits,
      v2(C2(DOT, regex(/[0-9]*/))),
      (a4, b3) => a4 + (b3 !== null ? "." + b3 : "")
    )
  ]),
  then3(
    d3([E_LOWER, E_UPPER]),
    v2(d3([PLUS, MINUS])),
    digits,
    (e4, expSign, expDigits) => e4 + (expSign ? expSign : "") + expDigits
  ),
  (base, exponent) => ["doubleConstantExpr", ["value", base + exponent]]
);
var decimalLiteral = d3([
  i3(C2(DOT, digits), (x2) => ["decimalConstantExpr", ["value", "." + x2]]),
  b2(S2(digits, DOT), v2(digits), (first, second) => [
    "decimalConstantExpr",
    ["value", first + "." + (second !== null ? second : "")]
  ])
]);
var integerLiteral = i3(
  digits,
  (x2) => ["integerConstantExpr", ["value", x2]]
);
var numericLiteral = S2(
  d3([doubleLiteral, decimalLiteral, integerLiteral]),
  q2(w3(regex(/[a-zA-Z]/), ["no alphabetical characters after numeric literal"]))
);
var contextItemExpr = i3(
  S2(
    DOT,
    q2(w3(DOT, ["context item should not be followed by another ."]))
  ),
  (_2) => ["contextItemExpr"]
);
var reservedFunctionNames = d3([
  ARRAY,
  ATTRIBUTE,
  COMMENT,
  DOCUMENT_NODE,
  ELEMENT,
  EMPTY_SEQUENCE,
  FUNCTION,
  IF,
  ITEM,
  MAP,
  NAMESPACE_NODE,
  NODE,
  PROCESSING_INSTRUCTION,
  SCHEMA_ATTRIBUTE,
  SCHEMA_ELEMENT,
  SWITCH,
  TEXT,
  TYPESWITCH
]);
var argumentPlaceholder = wrapArray(
  alias([QUESTION_MARK], "argumentPlaceholder")
);
var occurrenceIndicator = d3([
  QUESTION_MARK,
  ASTERIX,
  PLUS
]);
var elementContentChar = C2(
  q2(w3(regex(/[{}<&]/), ["elementContentChar cannot be {, }, <, or &"])),
  char
);
var cdataSection = i3(
  $2(
    CDATA_OPEN,
    p2(
      C2(
        q2(w3(CDATA_CLOSE, ['CDataSection content may not contain "]]>"'])),
        char
      )
    ),
    CDATA_CLOSE,
    true
  ),
  (contents) => ["CDataSection", contents.join("")]
);
var quotAttrValueContentChar = C2(
  q2(w3(regex(/[\"{}<&]/), ['quotAttrValueContentChar cannot be ", {, }, <, or &'])),
  char
);
var aposAttrValueContentChar = C2(
  q2(w3(regex(/[\'{}<&]/), ["aposAttrValueContentChar cannot be ', {, }, <, or &"])),
  char
);
var dirCommentContents = i3(
  p2(
    d3([
      C2(q2(w3(MINUS, [])), char),
      i3(
        precededMultiple(
          [MINUS, q2(w3(MINUS, []))],
          char
        ),
        (x2) => "-" + x2
      )
    ])
  ),
  (x2) => x2.join("")
);
var dirCommentConstructor = i3(
  $2(DIR_COMMENT_OPEN, dirCommentContents, DIR_COMMENT_CLOSE, true),
  (x2) => ["computedCommentConstructor", ["argExpr", ["stringConstantExpr", ["value", x2]]]]
);
var piTarget = a3(
  ncName,
  (target) => {
    return target.toLowerCase() !== "xml";
  },
  ['A processing instruction target cannot be "xml"']
);
var dirPiContents = i3(
  p2(C2(q2(w3(DIR_PI_CLOSE, [])), char)),
  (x2) => x2.join("")
);
var dirPiConstructor = b2(
  C2(DIR_PI_OPEN, D2(piTarget)),
  D2(S2(v2(C2(explicitWhitespace, dirPiContents)), DIR_PI_CLOSE)),
  (target, contents) => [
    "computedPIConstructor",
    ["piTarget", target],
    ["piValueExpr", ["stringConstantExpr", ["value", contents]]]
  ]
);
var locationPathAbbreviation = i3(DOUBLE_SLASH, (_2) => [
  "stepExpr",
  ["xpathAxis", "descendant-or-self"],
  ["anyKindTest"]
]);
var validationMode = d3([LAX, STRICT]);
var pragmaContents = i3(
  p2(S2(char, q2(w3(PRAGMA_END, ["Pragma contents should not contain '#)'"])))),
  (x2) => x2.join("")
);
var valueCompare2 = i3(
  S2(
    d3([EQ, NE, LT, LE, GT, GE]),
    assertAdjacentOpeningTerminal
  ),
  (x2) => x2 + "Op"
);
var nodeCompare2 = d3([
  S2(alias([IS], "isOp"), assertAdjacentOpeningTerminal),
  alias([LESS_THAN_DOUBLE], "nodeBeforeOp"),
  alias([GREATER_THAN_DOUBLE], "nodeAfterOp")
]);
var generalCompare2 = d3([
  alias([EQUALS], "equalOp"),
  alias([NOT_EQUALS], "notEqualOp"),
  alias([LESS_THAN_EQUALS], "lessThanOrEqualOp"),
  alias([LESS_THAN], "lessThanOp"),
  alias([GREATER_THAN_EQUALS], "greaterThanOrEqualOp"),
  alias([GREATER_THAN], "greaterThanOp")
]);
var compatibilityAnnotation = i3(UPDATING, (_2) => [
  "annotation",
  ["annotationName", "updating"]
]);
var separator = SEMICOLON;
var preserveMode = d3([PRESERVE, NO_PRESERVE]);
var inheritMode = d3([INHERIT, NO_INHERIT]);
var decimalFormatPropertyName = d3([
  DECIMAL_SEPARATOR,
  GROUPING_SEPARATOR,
  INFINITY,
  MINUS_SIGN,
  NAN,
  PERCENT,
  PER_MILLE,
  ZERO_DIGIT,
  DIGIT,
  PATTERN_SEPARATOR,
  EXPONENT_SEPARATOER
]);
var boundarySpaceDecl = i3(
  precededMultiple(
    [DECLARE, whitespacePlus, BOUNDARY_SPACE, whitespacePlus],
    d3([PRESERVE, STRIP])
  ),
  (x2) => ["boundarySpaceDecl", x2]
);
var constructionDecl = i3(
  precededMultiple(
    [DECLARE, whitespacePlus, CONSTRUCTION, whitespacePlus],
    d3([PRESERVE, STRIP])
  ),
  (x2) => ["constructionDecl", x2]
);
var orderingModeDecl = i3(
  precededMultiple(
    [DECLARE, whitespacePlus, ORDERING, whitespacePlus],
    d3([ORDERED, UNORDERED])
  ),
  (x2) => ["orderingModeDecl", x2]
);
var emptyOrderDecl = i3(
  precededMultiple(
    [
      DECLARE,
      whitespacePlus,
      DEFAULT,
      whitespacePlus,
      ORDER,
      whitespacePlus,
      EMPTY,
      whitespacePlus
    ],
    d3([GREATEST, LEAST])
  ),
  (x2) => ["emptyOrderDecl", x2]
);
var copyNamespacesDecl = b2(
  precededMultiple(
    [DECLARE, whitespacePlus, COPY_NAMESPACES, whitespacePlus],
    preserveMode
  ),
  precededMultiple([whitespace, COMMA, whitespace], inheritMode),
  (preserveModePart, inheritModePart) => [
    "copyNamespacesDecl",
    ["preserveMode", preserveModePart],
    ["inheritMode", inheritModePart]
  ]
);

// ../gh/fontoxpath/src/parsing/parsingUtils.ts
function isAttributeTest(test) {
  return test[0] === "attributeTest" || test[0] === "schemaAttributeTest";
}
function wrapInSequenceExprIfNeeded(exp) {
  switch (exp[0]) {
    // These expressions do not have to be wrapped (are allowed in a filterExpr)
    case "constantExpr":
    case "varRef":
    case "contextItemExpr":
    case "functionCallExpr":
    case "sequenceExpr":
    case "elementConstructor":
    case "computedElementConstructor":
    case "computedAttributeConstructor":
    case "computedDocumentConstructor":
    case "computedTextConstructor":
    case "computedCommentConstructor":
    case "computedNamespaceConstructor":
    case "computedPIConstructor":
    case "orderedExpr":
    case "unorderedExpr":
    case "namedFunctionRef":
    case "inlineFunctionExpr":
    case "dynamicFunctionInvocationExpr":
    case "mapConstructor":
    case "arrayConstructor":
    case "stringConstructor":
    case "unaryLookup":
      return exp;
  }
  return ["sequenceExpr", exp];
}
function assertValidCodePoint(codePoint) {
  if (codePoint >= 1 && codePoint <= 55295 || codePoint >= 57344 && codePoint <= 65533 || codePoint >= 65536 && codePoint <= 1114111) {
    return;
  }
  throw new Error(
    "XQST0090: The character reference " + codePoint + " (" + codePoint.toString(16) + ") does not reference a valid codePoint."
  );
}
function parseCharacterReferences(input) {
  return input.replace(/(&[^;]+);/g, (match) => {
    if (/^&#x/.test(match)) {
      const codePoint = parseInt(match.slice(3, -1), 16);
      assertValidCodePoint(codePoint);
      return String.fromCodePoint(codePoint);
    }
    if (/^&#/.test(match)) {
      const codePoint = parseInt(match.slice(2, -1), 10);
      assertValidCodePoint(codePoint);
      return String.fromCodePoint(codePoint);
    }
    switch (match) {
      case "&lt;":
        return "<";
      case "&gt;":
        return ">";
      case "&amp;":
        return "&";
      case "&quot;":
        return String.fromCharCode(34);
      case "&apos;":
        return String.fromCharCode(39);
    }
    throw new Error('XPST0003: Unknown character reference: "' + match + '"');
  });
}
function accumulateDirContents(parts, expressionsOnly, normalizeWhitespace2) {
  if (!parts.length) {
    return [];
  }
  let result = [parts[0]];
  for (let i4 = 1; i4 < parts.length; ++i4) {
    const prevResult = result[result.length - 1];
    if (typeof prevResult === "string" && typeof parts[i4] === "string") {
      result[result.length - 1] = prevResult + parts[i4];
      continue;
    }
    result.push(parts[i4]);
  }
  if (typeof result[0] === "string" && result.length === 0) {
    return [];
  }
  result = result.reduce((filteredItems, item, i4) => {
    if (typeof item !== "string") {
      filteredItems.push(item);
    } else if (!normalizeWhitespace2 || !/^\s*$/.test(item)) {
      filteredItems.push(parseCharacterReferences(item));
    } else {
      const next = result[i4 + 1];
      if (next && next[0] === "CDataSection") {
        filteredItems.push(parseCharacterReferences(item));
      } else {
        const previous = result[i4 - 1];
        if (previous && previous[0] === "CDataSection") {
          filteredItems.push(parseCharacterReferences(item));
        }
      }
    }
    return filteredItems;
  }, []);
  if (!result.length) {
    return result;
  }
  if (result.length > 1 || expressionsOnly) {
    for (let i4 = 0; i4 < result.length; i4++) {
      if (typeof result[i4] === "string") {
        result[i4] = ["stringConstantExpr", ["value", result[i4]]];
      }
    }
  }
  return result;
}
function getQName2(qname) {
  return qname[0].prefix ? qname[0].prefix + ":" + qname[1] : qname[1];
}
function assertEqualQNames(a4, b3) {
  const nameA = getQName2(a4);
  const nameB = getQName2(b3);
  if (nameA !== nameB) {
    throw new Error(
      'XQST0118: The start and the end tag of an element constructor must be equal. "' + nameA + '" does not match "' + nameB + '"'
    );
  }
}

// ../gh/fontoxpath/src/parsing/typesParser.ts
var typeName = eqName;
var simpleTypeName = typeName;
var singleType = b2(
  simpleTypeName,
  v2(QUESTION_MARK),
  (type, opt) => opt !== null ? ["singleType", ["atomicType", ...type], ["optional"]] : ["singleType", ["atomicType", ...type]]
);
var atomicOrUnionType = i3(eqName, (x2) => ["atomicType", ...x2]);

// ../gh/fontoxpath/src/parsing/prscParser.ts
var pathExprCache = /* @__PURE__ */ new Map();
function generateParser(options) {
  function defaultBinaryOperatorFn(lhs, rhs) {
    return rhs.reduce((lh, rh) => [rh[0], ["firstOperand", lh], ["secondOperand", rh[1]]], lhs);
  }
  function binaryOperator2(exp, operator, constructionFn) {
    return b2(
      exp,
      p2(b2(surrounded(operator, whitespace), D2(exp), (a4, b3) => [a4, b3])),
      constructionFn
    );
  }
  function nonRepeatableBinaryOperator(exp, operator, firstArgName = "firstOperand", secondArgName = "secondOperand") {
    return b2(
      exp,
      v2(b2(surrounded(operator, whitespace), D2(exp), (a4, b3) => [a4, b3])),
      (lhs, rhs) => {
        if (rhs === null) {
          return lhs;
        }
        return [rhs[0], [firstArgName, lhs], [secondArgName, rhs[1]]];
      }
    );
  }
  const stackTraceMap = /* @__PURE__ */ new Map();
  function wrapInStackTrace(parser) {
    if (!options.outputDebugInfo) {
      return parser;
    }
    return (input, offset) => {
      const result = parser(input, offset);
      if (!result.success) {
        return result;
      }
      const start = stackTraceMap.has(offset) ? stackTraceMap.get(offset) : {
        offset,
        line: -1,
        column: -1
      };
      const end = stackTraceMap.has(result.offset) ? stackTraceMap.get(result.offset) : {
        offset: result.offset,
        line: -1,
        column: -1
      };
      stackTraceMap.set(offset, start);
      stackTraceMap.set(result.offset, end);
      const comment2 = result.value.comment;
      return n3(result.offset, [
        "x:stackTrace",
        {
          start,
          end,
          ...comment2 ? { comment: comment2 } : {}
        },
        result.value
      ]);
    };
  }
  const predicate = C2(
    BRACKET_OPEN,
    S2(surrounded(expr, whitespace), BRACKET_CLOSE)
  );
  const stringLiteral = i3(
    options.xquery ? d3([
      surrounded(
        p2(d3([predefinedEntityRef, charRef, escapeQuot, regex(/[^\"&]/)])),
        DOUBLE_QUOTE
      ),
      surrounded(
        p2(d3([predefinedEntityRef, charRef, escapeApos, regex(/[^'&]/)])),
        SINGLE_QUOTE
      )
    ]) : d3([
      surrounded(p2(d3([escapeQuot, regex(/[^\"]/)])), DOUBLE_QUOTE),
      surrounded(p2(d3([escapeApos, regex(/[^']/)])), SINGLE_QUOTE)
    ]),
    (x2) => x2.join("")
  );
  const elementTest2 = d3([
    i3(
      precededMultiple(
        [ELEMENT, whitespace],
        $2(
          S2(BRACE_OPEN, whitespace),
          b2(
            elementNameOrWildCard,
            precededMultiple([whitespace, COMMA, whitespace], typeName),
            (elemName, type) => [
              ["elementName", elemName],
              ["typeName", ...type]
            ]
          ),
          C2(whitespace, BRACE_CLOSE)
        )
      ),
      ([nameOrWildcard, type]) => ["elementTest", nameOrWildcard, type]
    ),
    i3(
      precededMultiple(
        [ELEMENT, whitespace],
        $2(BRACE_OPEN, elementNameOrWildCard, BRACE_CLOSE)
      ),
      (nameOrWildcard) => ["elementTest", ["elementName", nameOrWildcard]]
    ),
    i3(
      precededMultiple(
        [ELEMENT, whitespace],
        $2(BRACE_OPEN, whitespace, BRACE_CLOSE)
      ),
      (_2) => ["elementTest"]
    )
  ]);
  const attribNameOrWildCard = d3([
    i3(elementName, (qname) => ["QName", ...qname]),
    i3(ASTERIX, (_2) => ["star"])
  ]);
  const attributeTest2 = d3([
    i3(
      precededMultiple(
        [ATTRIBUTE, whitespace],
        $2(
          S2(BRACE_OPEN, whitespace),
          b2(
            attribNameOrWildCard,
            precededMultiple([whitespace, COMMA, whitespace], typeName),
            (attrName, type) => [
              ["attributeName", attrName],
              ["typeName", ...type]
            ]
          ),
          C2(whitespace, BRACE_CLOSE)
        )
      ),
      ([nameOrWildcard, type]) => ["attributeTest", nameOrWildcard, type]
    ),
    i3(
      precededMultiple(
        [ATTRIBUTE, whitespace],
        $2(BRACE_OPEN, attribNameOrWildCard, BRACE_CLOSE)
      ),
      (nameOrWildcard) => ["attributeTest", ["attributeName", nameOrWildcard]]
    ),
    i3(
      precededMultiple(
        [ATTRIBUTE, whitespace],
        $2(BRACE_OPEN, whitespace, BRACE_CLOSE)
      ),
      (_2) => ["attributeTest"]
    )
  ]);
  const elementDeclaration = elementName;
  const schemaElementTest = i3(
    precededMultiple(
      [SCHEMA_ELEMENT, whitespace, BRACE_OPEN],
      S2(elementDeclaration, BRACE_CLOSE)
    ),
    (x2) => ["schemaElementTest", ...x2]
  );
  const attributeName = eqName;
  const attributeDeclaration = attributeName;
  const schemaAttributeTest = i3(
    $2(
      SCHEMA_ATTRIBUTE_OPEN,
      surrounded(attributeDeclaration, whitespace),
      BRACE_CLOSE
    ),
    (decl) => ["schemaAttributeTest", ...decl]
  );
  const documentTest2 = i3(
    C2(
      DOCUMENT_NODE_OPEN,
      S2(
        surrounded(v2(d3([elementTest2, schemaElementTest])), whitespace),
        BRACE_CLOSE
      )
    ),
    (x2) => ["documentTest", ...x2 ? [x2] : []]
  );
  const piTest2 = d3([
    i3(
      C2(
        PROCESSING_INSTRUCTION_OPEN,
        S2(surrounded(d3([ncName, stringLiteral]), whitespace), BRACE_CLOSE)
      ),
      (target) => ["piTest", ["piTarget", target]]
    ),
    wrapArray(alias([PROCESSING_INSTRUCTION_TEST], "piTest"))
  ]);
  const kindTest = d3([
    documentTest2,
    elementTest2,
    attributeTest2,
    schemaElementTest,
    schemaAttributeTest,
    piTest2,
    commentTest2,
    textTest2,
    namespaceNodeTest,
    anyKindTest2
  ]);
  const wildcard2 = d3([
    i3(C2(ASTERIX_COLON, ncName), (x2) => [
      "Wildcard",
      ["star"],
      ["NCName", x2]
    ]),
    wrapArray(alias([ASTERIX], "Wildcard")),
    i3(S2(bracedURILiteral, ASTERIX), (x2) => ["Wildcard", ["uri", x2], ["star"]]),
    i3(S2(ncName, COLON_ASTERIX), (x2) => [
      "Wildcard",
      ["NCName", x2],
      ["star"]
    ])
  ]);
  const nameTest2 = d3([wildcard2, i3(eqName, (x2) => ["nameTest", ...x2])]);
  const simpleNodeTest = d3([kindTest, nameTest2]);
  const unionNodeTest2 = i3(
    $2(
      S2(BRACE_OPEN, whitespace),
      b2(
        simpleNodeTest,
        p2(C2(surrounded(VERTICAL_BAR, whitespace), simpleNodeTest)),
        (first, rest) => [first].concat(rest)
      ),
      S2(whitespace, BRACE_CLOSE),
      true
    ),
    (tests2) => ["unionNodeTest", ...tests2]
  );
  const nodeTest = options.version === 4 ? d3([unionNodeTest2, simpleNodeTest]) : simpleNodeTest;
  const abbrevForwardStep = options.version === 4 ? d3([
    i3(C2(AT_SIGN, nodeTest), (test) => [
      "stepExpr",
      ["xpathAxis", "attribute"],
      test
    ]),
    i3(simpleNodeTest, (test) => ["stepExpr", ["xpathAxis", "child"], test])
  ]) : b2(v2(AT_SIGN), simpleNodeTest, (a4, b3) => {
    return a4 !== null || isAttributeTest(b3) ? ["stepExpr", ["xpathAxis", "attribute"], b3] : ["stepExpr", ["xpathAxis", "child"], b3];
  });
  const forwardStep = d3([
    b2(forwardAxis, nodeTest, (axis, test) => ["stepExpr", ["xpathAxis", axis], test]),
    abbrevForwardStep
  ]);
  const abbrevReverseStep = i3(DOUBLE_DOT, (_2) => [
    "stepExpr",
    ["xpathAxis", "parent"],
    ["anyKindTest"]
  ]);
  const reverseStep = d3([
    b2(reverseAxis, nodeTest, (axis, test) => ["stepExpr", ["xpathAxis", axis], test]),
    abbrevReverseStep
  ]);
  const predicateList = i3(
    p2(C2(whitespace, predicate)),
    (x2) => x2.length > 0 ? ["predicates", ...x2] : void 0
  );
  const axisStep = b2(
    d3([reverseStep, forwardStep]),
    predicateList,
    (a4, b3) => b3 === void 0 ? a4 : a4.concat([b3])
  );
  const literal = d3([
    numericLiteral,
    i3(stringLiteral, (x2) => [
      "stringConstantExpr",
      ["value", options.xquery ? parseCharacterReferences(x2) : x2]
    ])
  ]);
  const parenthesizedExpr = d3([
    $2(BRACE_OPEN, surrounded(expr, whitespace), BRACE_CLOSE),
    i3($2(BRACE_OPEN, whitespace, BRACE_CLOSE), (_2) => ["sequenceExpr"])
  ]);
  const argument = d3([exprSingle, argumentPlaceholder]);
  const argumentList = i3(
    $2(
      BRACE_OPEN,
      surrounded(
        v2(
          b2(
            argument,
            p2(C2(surrounded(COMMA, whitespace), argument)),
            (first, following) => [first, ...following]
          )
        ),
        whitespace
      ),
      BRACE_CLOSE
    ),
    (x2) => x2 !== null ? x2 : []
  );
  function qnameToString(functionName) {
    const prefix2 = functionName[0].prefix;
    const uri = functionName[0]["URI"];
    const localPart2 = functionName[1];
    if (prefix2) {
      return `${prefix2}:${localPart2}`;
    }
    if (uri) {
      return `Q{${uri}}${localPart2}`;
    }
    return localPart2;
  }
  const functionCall2 = C2(
    w3(
      then3(reservedFunctionNames, whitespace, BRACE_OPEN, (_a, _b, _c) => void 0),
      ["cannot use reserved keyword for function names"]
    ),
    wrapInStackTrace(
      b2(eqName, C2(whitespace, argumentList), (functionName, args) => {
        const result = [
          "functionCallExpr",
          ["functionName", ...functionName],
          args !== null ? ["arguments", ...args] : ["arguments"]
        ];
        result.comment = qnameToString(functionName);
        return result;
      })
    )
  );
  const namedFunctionRef2 = b2(
    eqName,
    C2(HASHTAG, integerLiteral),
    (functionName, integer) => ["namedFunctionRef", ["functionName", ...functionName], integer]
  );
  const enclosedExpr = $2(
    CURLY_BRACE_OPEN,
    surrounded(v2(expr), whitespace),
    CURLY_BRACE_CLOSE
  );
  const functionBody = i3(enclosedExpr, (x2) => x2 ? x2 : ["sequenceExpr"]);
  const sequenceType = d3([
    i3(EMPTY_SEQUENCE_TEST, (_2) => [["voidSequenceType"]]),
    b2(
      itemTypeIndirect,
      v2(C2(whitespace, occurrenceIndicator)),
      (type, occurrence) => [
        type,
        ...occurrence !== null ? [["occurrenceIndicator", occurrence]] : []
      ]
    )
  ]);
  const annotation = b2(
    precededMultiple([PERCENT, whitespace], eqName),
    v2(
      S2(
        b2(
          precededMultiple([BRACE_OPEN, whitespace], literal),
          p2(precededMultiple([COMMA, whitespace], literal)),
          (lhs, rhs) => lhs.concat(rhs)
        ),
        BRACE_CLOSE
      )
    ),
    (annotationName, params) => [
      "annotation",
      ["annotationName", ...annotationName],
      ...params ? ["arguments", params] : []
    ]
  );
  const anyFunctionTest = i3(
    precededMultiple(
      [
        FUNCTION,
        whitespace,
        BRACE_OPEN,
        whitespace,
        ASTERIX,
        whitespace
      ],
      BRACE_CLOSE
    ),
    (_2) => ["anyFunctionTest"]
  );
  const typedFunctionTest = b2(
    precededMultiple(
      [FUNCTION, whitespace, BRACE_OPEN, whitespace],
      v2(
        binaryOperator2(
          sequenceType,
          COMMA,
          (lhs, rhs) => lhs.concat.apply(
            lhs,
            rhs.map((x2) => x2[1])
          )
        )
      )
    ),
    precededMultiple(
      [whitespace, BRACE_CLOSE, whitespacePlus, AS, whitespacePlus],
      sequenceType
    ),
    (paramTypeList, returnType) => [
      "typedFunctionTest",
      ["paramTypeList", ["sequenceType", ...paramTypeList ? paramTypeList : []]],
      ["sequenceType", ...returnType]
    ]
  );
  const functionTest = b2(
    p2(annotation),
    d3([anyFunctionTest, typedFunctionTest]),
    (annotations, test) => [test[0], ...annotations, ...test.slice(1)]
  );
  const anyMapTest2 = i3(
    precededMultiple(
      [MAP, whitespace, BRACE_OPEN, whitespace, ASTERIX, whitespace],
      BRACE_CLOSE
    ),
    (_2) => ["anyMapTest"]
  );
  const typedMapTest = b2(
    precededMultiple(
      [MAP, whitespace, BRACE_OPEN, whitespace],
      atomicOrUnionType
    ),
    precededMultiple(
      [whitespace, COMMA],
      S2(surrounded(sequenceType, whitespace), BRACE_CLOSE)
    ),
    (keyType, valueType) => ["typedMapTest", keyType, ["sequenceType", ...valueType]]
  );
  const mapTest = d3([anyMapTest2, typedMapTest]);
  const anyArrayTest2 = i3(
    precededMultiple(
      [ARRAY, whitespace, BRACE_OPEN, whitespace, ASTERIX, whitespace],
      BRACE_CLOSE
    ),
    (_2) => ["anyArrayTest"]
  );
  const typedArrayTest = i3(
    precededMultiple(
      [ARRAY, whitespace, BRACE_OPEN],
      S2(surrounded(sequenceType, whitespace), BRACE_CLOSE)
    ),
    (type) => ["typedArrayTest", ["sequenceType", ...type]]
  );
  const arrayTest = d3([anyArrayTest2, typedArrayTest]);
  const parenthesizedItemType = i3(
    $2(BRACE_OPEN, surrounded(itemTypeIndirect, whitespace), BRACE_CLOSE),
    (x2) => ["parenthesizedItemType", x2]
  );
  const itemType = d3([
    kindTest,
    wrapArray(alias([ITEM_TYPE_TEST], "anyItemType")),
    functionTest,
    mapTest,
    arrayTest,
    atomicOrUnionType,
    parenthesizedItemType
  ]);
  function itemTypeIndirect(input, offset) {
    return itemType(input, offset);
  }
  const typeDeclaration = i3(
    precededMultiple([AS, whitespacePlus], sequenceType),
    (x2) => ["typeDeclaration", ...x2]
  );
  const param = b2(
    C2(DOLLAR, eqName),
    v2(C2(whitespacePlus, typeDeclaration)),
    (variableName, typeDecl) => [
      "param",
      ["varName", ...variableName],
      ...typeDecl ? [typeDecl] : []
    ]
  );
  const paramList = binaryOperator2(param, COMMA, (lhs, rhs) => [
    lhs,
    ...rhs.map((x2) => x2[1])
  ]);
  const inlineFunctionExpr = then4(
    p2(annotation),
    precededMultiple(
      [whitespace, FUNCTION, whitespace, BRACE_OPEN, whitespace],
      v2(paramList)
    ),
    precededMultiple(
      [whitespace, BRACE_CLOSE, whitespace],
      v2(
        i3(
          precededMultiple([AS, whitespace], S2(sequenceType, whitespace)),
          (x2) => ["typeDeclaration", ...x2]
        )
      )
    ),
    functionBody,
    (annotations, params, typeDecl, body) => [
      "inlineFunctionExpr",
      ...annotations,
      ["paramList", ...params ? params : []],
      ...typeDecl ? [typeDecl] : [],
      ["functionBody", body]
    ]
  );
  const functionItemExpr = d3([namedFunctionRef2, inlineFunctionExpr]);
  const mapKeyExpr = i3(exprSingle, (x2) => ["mapKeyExpr", x2]);
  const mapValueExpr = i3(exprSingle, (x2) => ["mapValueExpr", x2]);
  const mapConstructorEntry = b2(
    mapKeyExpr,
    C2(surrounded(COLON, whitespace), mapValueExpr),
    (k2, v3) => ["mapConstructorEntry", k2, v3]
  );
  const mapConstructor2 = C2(
    MAP,
    $2(
      surrounded(CURLY_BRACE_OPEN, whitespace),
      i3(
        v2(
          binaryOperator2(
            mapConstructorEntry,
            surrounded(COMMA, whitespace),
            (lhs, rhs) => [lhs, ...rhs.map((x2) => x2[1])]
          )
        ),
        (entries) => entries ? ["mapConstructor", ...entries] : ["mapConstructor"]
      ),
      C2(whitespace, CURLY_BRACE_CLOSE)
    )
  );
  const squareArrayConstructor = i3(
    $2(
      BRACKET_OPEN,
      surrounded(
        v2(
          binaryOperator2(
            exprSingle,
            COMMA,
            (lhs, rhs) => [lhs, ...rhs.map((x2) => x2[1])].map((x2) => ["arrayElem", x2])
          )
        ),
        whitespace
      ),
      BRACKET_CLOSE
    ),
    (x2) => ["squareArray", ...x2 !== null ? x2 : []]
  );
  const curlyArrayConstructor = i3(
    C2(ARRAY, C2(whitespace, enclosedExpr)),
    (x2) => ["curlyArray", ...x2 !== null ? [["arrayElem", x2]] : []]
  );
  const arrayConstructor2 = i3(
    d3([squareArrayConstructor, curlyArrayConstructor]),
    (x2) => ["arrayConstructor", x2]
  );
  const stringConstructorChars = i3(
    p2(
      C2(
        q2(
          w3(
            d3([
              STRING_INTERPOLATION_OPEN,
              STRING_INTERPOLATION_CLOSE,
              STRING_CONSTRUCTOR_CLOSE
            ]),
            ["String constructors can not contain interpolation characters"]
          )
        ),
        char
      )
    ),
    (x2) => ["stringConstructorChars", x2.join("")]
  );
  const stringConstructorInterpolation = i3(
    $2(STRING_INTERPOLATION_OPEN, expr, STRING_INTERPOLATION_CLOSE, true),
    (ast) => ["stringConstructorInterpolation", ast]
  );
  const stringConstructorContent = b2(
    stringConstructorChars,
    p2(
      b2(stringConstructorInterpolation, stringConstructorChars, (interpolation, chars) => [
        interpolation,
        chars
      ])
    ),
    (a4, b3) => {
      const toReturn = [a4];
      for (const [interpolation, chars] of b3) {
        toReturn.push(interpolation, chars);
      }
      return toReturn;
    }
  );
  const stringConstructor = i3(
    $2(
      STRING_CONSTRUCTOR_OPEN,
      stringConstructorContent,
      STRING_CONSTRUCTOR_CLOSE,
      true
    ),
    (contents) => ["stringConstructor", ...contents]
  );
  const keySpecifier = d3([
    ncName,
    integerLiteral,
    parenthesizedExpr,
    ASTERIX
  ]);
  const unaryLookup = i3(
    C2(QUESTION_MARK, C2(whitespace, keySpecifier)),
    (x2) => {
      return x2 === "*" ? ["unaryLookup", ["star"]] : typeof x2 === "string" ? ["unaryLookup", ["NCName", x2]] : ["unaryLookup", x2];
    }
  );
  const commonContent = d3([
    predefinedEntityRef,
    charRef,
    alias([CURLY_BRACE_OPEN_DOUBLE], "{"),
    alias([CURLY_BRACE_CLOSE_DOUBLE], "}"),
    i3(enclosedExpr, (x2) => x2 || ["sequenceExpr"])
  ]);
  const dirElemContent = d3([
    cdataSection,
    directConstructorIndirect,
    commonContent,
    elementContentChar
  ]);
  const quotAttrValueContent = d3([
    i3(quotAttrValueContentChar, (x2) => x2.replace(/[\x20\x0D\x0A\x09]/g, " ")),
    commonContent
  ]);
  const aposAttrValueContent = d3([
    i3(aposAttrValueContentChar, (x2) => x2.replace(/[\x20\x0D\x0A\x09]/g, " ")),
    commonContent
  ]);
  const dirAttributeValue = i3(
    d3([
      surrounded(p2(d3([escapeQuot, quotAttrValueContent])), DOUBLE_QUOTE),
      surrounded(p2(d3([escapeApos, aposAttrValueContent])), SINGLE_QUOTE)
    ]),
    (x2) => accumulateDirContents(x2, false, false)
  );
  const attribute = b2(
    qName,
    C2(surrounded(EQUALS, v2(explicitWhitespace)), dirAttributeValue),
    (attrName, value) => {
      if (attrName[0].prefix === "" && attrName[1] === "xmlns") {
        if (value.length && typeof value[0] !== "string") {
          throw new Error(
            "XQST0022: A namespace declaration may not contain enclosed expressions"
          );
        }
        return ["namespaceDeclaration", value.length ? ["uri", value[0]] : ["uri"]];
      }
      if (attrName[0].prefix === "xmlns") {
        if (value.length && typeof value[0] !== "string") {
          throw new Error(
            "XQST0022: The namespace declaration for 'xmlns:" + attrName[1] + "' may not contain enclosed expressions"
          );
        }
        return [
          "namespaceDeclaration",
          ["prefix", attrName[1]],
          value.length ? ["uri", value[0]] : ["uri"]
        ];
      }
      return [
        "attributeConstructor",
        ["attributeName"].concat(attrName),
        value.length === 0 ? ["attributeValue"] : value.length === 1 && typeof value[0] === "string" ? ["attributeValue", value[0]] : ["attributeValueExpr"].concat(value)
      ];
    }
  );
  const dirAttributeList = i3(
    p2(C2(explicitWhitespace, v2(attribute))),
    (x2) => x2.filter(Boolean)
  );
  const dirElemConstructor = then3(
    C2(LESS_THAN, qName),
    dirAttributeList,
    d3([
      i3(DIR_ELEM_CLOSE, (_2) => null),
      b2(
        C2(GREATER_THAN, p2(dirElemContent)),
        precededMultiple(
          [whitespace, DIR_ELEM_OPEN_CONTENT],
          S2(
            qName,
            b2(v2(explicitWhitespace), GREATER_THAN, (_2) => null)
          )
        ),
        (contents, endName) => {
          return [accumulateDirContents(contents, true, true), endName];
        }
      )
    ]),
    (tagName, attList, contentsEndName) => {
      let contents = contentsEndName;
      if (contentsEndName && contentsEndName.length) {
        assertEqualQNames(tagName, contentsEndName[1]);
        contents = contentsEndName[0];
      }
      return [
        "elementConstructor",
        ["tagName", ...tagName],
        ...attList.length ? [["attributeList", ...attList]] : [],
        ...contents && contents.length ? [["elementContent", ...contents]] : []
      ];
    }
  );
  const directConstructor = d3([
    dirElemConstructor,
    dirCommentConstructor,
    dirPiConstructor
  ]);
  function directConstructorIndirect(input, offset) {
    return directConstructor(input, offset);
  }
  const compDocConstructor = i3(
    precededMultiple([DOCUMENT, whitespace], enclosedExpr),
    (x2) => ["computedDocumentConstructor", ...x2 ? [["argExpr", x2]] : []]
  );
  const enclosedContentExpr = i3(
    enclosedExpr,
    (x2) => x2 ? [["contentExpr", x2]] : []
  );
  const compElemConstructor = b2(
    precededMultiple(
      [ELEMENT, whitespace],
      d3([
        i3(eqName, (x2) => ["tagName", ...x2]),
        i3(
          $2(
            CURLY_BRACE_OPEN,
            surrounded(expr, whitespace),
            CURLY_BRACE_CLOSE
          ),
          (x2) => ["tagNameExpr", x2]
        )
      ])
    ),
    C2(whitespace, enclosedContentExpr),
    (tagName, content) => ["computedElementConstructor", tagName, ...content]
  );
  const compAttrConstructor = b2(
    C2(
      ATTRIBUTE,
      d3([
        i3(
          precededMultiple([assertAdjacentOpeningTerminal, whitespace], eqName),
          (x2) => ["tagName", ...x2]
        ),
        i3(
          C2(
            whitespace,
            $2(
              CURLY_BRACE_OPEN,
              surrounded(expr, whitespace),
              CURLY_BRACE_CLOSE
            )
          ),
          (x2) => ["tagNameExpr", x2]
        )
      ])
    ),
    C2(whitespace, enclosedExpr),
    (constructorName, valExpr) => [
      "computedAttributeConstructor",
      constructorName,
      ["valueExpr", valExpr ? valExpr : ["sequenceExpr"]]
    ]
  );
  const enclosedPrefixExpr = i3(
    enclosedExpr,
    (x2) => x2 ? [["prefixExpr", x2]] : []
  );
  const enclosedUriExpr = i3(enclosedExpr, (x2) => x2 ? [["URIExpr", x2]] : []);
  const compNamespaceConstructor = b2(
    precededMultiple(
      [NAMESPACE, whitespace],
      d3([prefix, enclosedPrefixExpr])
    ),
    C2(whitespace, enclosedUriExpr),
    (prefixPart, uri) => ["computedNamespaceConstructor", ...prefixPart, ...uri]
  );
  const compTextConstructor = i3(
    precededMultiple([TEXT, whitespace], enclosedExpr),
    (x2) => ["computedTextConstructor", ...x2 ? [["argExpr", x2]] : []]
  );
  const compCommentConstructor = i3(
    precededMultiple([COMMENT, whitespace], enclosedExpr),
    (x2) => ["computedCommentConstructor", ...x2 ? [["argExpr", x2]] : []]
  );
  const compPiConstructor = precededMultiple(
    [PROCESSING_INSTRUCTION, whitespace],
    b2(
      d3([
        i3(ncName, (x2) => ["piTarget", x2]),
        i3(
          $2(
            CURLY_BRACE_OPEN,
            surrounded(expr, whitespace),
            CURLY_BRACE_CLOSE
          ),
          (x2) => ["piTargetExpr", x2]
        )
      ]),
      C2(whitespace, enclosedExpr),
      (target, value) => [
        "computedPIConstructor",
        target,
        ...value ? [["piValueExpr", value]] : []
      ]
    )
  );
  const computedConstructor = d3([
    compDocConstructor,
    compElemConstructor,
    compAttrConstructor,
    compNamespaceConstructor,
    compTextConstructor,
    compCommentConstructor,
    compPiConstructor
  ]);
  const nodeConstructor = d3([directConstructor, computedConstructor]);
  const primaryExpr = d3([
    literal,
    varRef2,
    parenthesizedExpr,
    contextItemExpr,
    functionCall2,
    // orderedExpr,
    // unorderedExpr,
    nodeConstructor,
    functionItemExpr,
    mapConstructor2,
    arrayConstructor2,
    stringConstructor,
    unaryLookup
  ]);
  const lookup = i3(
    precededMultiple([QUESTION_MARK, whitespace], keySpecifier),
    (x2) => x2 === "*" ? ["lookup", ["star"]] : typeof x2 === "string" ? ["lookup", ["NCName", x2]] : ["lookup", x2]
  );
  const postfixExprWithStep = b2(
    i3(primaryExpr, (x2) => wrapInSequenceExprIfNeeded(x2)),
    p2(
      d3([
        i3(C2(whitespace, predicate), (x2) => ["predicate", x2]),
        i3(C2(whitespace, argumentList), (x2) => ["argumentList", x2]),
        C2(whitespace, lookup)
      ])
    ),
    (expression, postfixExpr) => {
      let toWrap = [expression];
      const predicates = [];
      const filters = [];
      let allowSinglePredicate = false;
      function flushPredicates() {
        if (allowSinglePredicate && predicates.length === 1) {
          filters.push(["predicate", predicates[0]]);
        } else if (predicates.length !== 0) {
          filters.push(["predicates", ...predicates]);
        }
        predicates.length = 0;
      }
      function flushFilters(ensureFilter) {
        flushPredicates();
        if (filters.length !== 0) {
          if (toWrap[0][0] === "sequenceExpr" && toWrap[0].length > 2) {
            toWrap = [["sequenceExpr", ...toWrap]];
          }
          toWrap = [["filterExpr", ...toWrap], ...filters];
          filters.length = 0;
        } else if (ensureFilter) {
          toWrap = [["filterExpr", ...toWrap]];
        }
      }
      for (const postFix of postfixExpr) {
        switch (postFix[0]) {
          case "predicate":
            predicates.push(postFix[1]);
            break;
          case "lookup":
            allowSinglePredicate = true;
            flushPredicates();
            filters.push(postFix);
            break;
          case "argumentList":
            flushFilters(false);
            if (toWrap.length > 1) {
              toWrap = [
                ["sequenceExpr", ["pathExpr", ["stepExpr", ...toWrap]]]
              ];
            }
            toWrap = [
              [
                "dynamicFunctionInvocationExpr",
                ["functionItem", ...toWrap],
                ...postFix[1].length ? [["arguments", ...postFix[1]]] : []
              ]
            ];
            break;
          default:
            throw new Error("unreachable");
        }
      }
      flushFilters(true);
      return toWrap;
    }
  );
  const stepExprWithForcedStep = d3([
    i3(postfixExprWithStep, (x2) => ["stepExpr", ...x2]),
    axisStep
  ]);
  const postfixExprWithoutStep = S2(
    primaryExpr,
    q2(
      w3(C2(whitespace, d3([predicate, argumentList, lookup])), [
        "primary expression not followed by predicate, argumentList, or lookup"
      ])
    )
  );
  const stepExprWithoutStep = postfixExprWithoutStep;
  const relativePathExpr = d3([
    then3(
      stepExprWithForcedStep,
      C2(whitespace, locationPathAbbreviation),
      C2(whitespace, relativePathExprWithForcedStepIndirect),
      (lhs, abbrev, rhs) => ["pathExpr", lhs, abbrev, ...rhs]
    ),
    b2(
      stepExprWithForcedStep,
      C2(surrounded(SLASH, whitespace), relativePathExprWithForcedStepIndirect),
      (lhs, rhs) => ["pathExpr", lhs, ...rhs]
    ),
    stepExprWithoutStep,
    i3(stepExprWithForcedStep, (x2) => ["pathExpr", x2])
  ]);
  const relativePathExprWithForcedStep = d3([
    then3(
      stepExprWithForcedStep,
      C2(whitespace, locationPathAbbreviation),
      C2(whitespace, relativePathExprWithForcedStepIndirect),
      (lhs, abbrev, rhs) => [lhs, abbrev, ...rhs]
    ),
    b2(
      stepExprWithForcedStep,
      C2(surrounded(SLASH, whitespace), relativePathExprWithForcedStepIndirect),
      (lhs, rhs) => [lhs, ...rhs]
    ),
    i3(stepExprWithForcedStep, (x2) => [x2])
  ]);
  function relativePathExprWithForcedStepIndirect(input, offset) {
    return relativePathExprWithForcedStep(input, offset);
  }
  const absoluteLocationPath = d3([
    i3(precededMultiple([SLASH, whitespace], relativePathExprWithForcedStep), (x2) => [
      "pathExpr",
      ["rootExpr"],
      ...x2
    ]),
    b2(
      locationPathAbbreviation,
      C2(whitespace, relativePathExprWithForcedStep),
      (abbrev, path) => ["pathExpr", ["rootExpr"], abbrev, ...path]
    ),
    i3(
      S2(
        SLASH,
        w3(
          C2(whitespace, options.xquery ? regex(/[*<a-zA-Z]/) : regex(/[*a-zA-Z]/)),
          [
            "Single rootExpr cannot be by followed by something that can be interpreted as a relative path"
          ]
        )
      ),
      (_2) => ["pathExpr", ["rootExpr"]]
    )
  ]);
  const pathExpr2 = cached(
    d3([relativePathExpr, absoluteLocationPath]),
    pathExprCache
  );
  const validateExpr = C2(
    VALIDATE,
    b2(
      v2(
        d3([
          i3(C2(whitespace, validationMode), (mode) => ["validationMode", mode]),
          i3(precededMultiple([whitespace, TYPE, whitespace], typeName), (t4) => [
            "type",
            ...t4
          ])
        ])
      ),
      $2(
        C2(whitespace, CURLY_BRACE_OPEN),
        surrounded(expr, whitespace),
        CURLY_BRACE_CLOSE
      ),
      (modeOrType, argExpr) => ["validateExpr", ...modeOrType ? [modeOrType] : [], ["argExpr", argExpr]]
    )
  );
  const pragma = $2(
    PRAGMA_START,
    b2(
      C2(whitespace, eqName),
      v2(C2(whitespacePlus, pragmaContents)),
      (pragmaName, contents) => contents ? ["pragma", ["pragmaName", pragmaName], ["pragmaContents", contents]] : ["pragma", ["pragmaName", pragmaName]]
    ),
    C2(whitespace, PRAGMA_END)
  );
  const extensionExpr = i3(
    S2(
      P2(pragma),
      C2(
        whitespace,
        $2(
          CURLY_BRACE_OPEN,
          surrounded(v2(expr), whitespace),
          CURLY_BRACE_CLOSE
        )
      )
    ),
    (extension) => ["extensionExpr", ...extension]
  );
  const simpleMapExpr = wrapInStackTrace(
    binaryOperator2(pathExpr2, EXCLAMATION_MARK, (lhs, rhs) => {
      return rhs.length === 0 ? lhs : [
        "simpleMapExpr",
        lhs[0] === "pathExpr" ? lhs : [
          "pathExpr",
          ["stepExpr", ["filterExpr", wrapInSequenceExprIfNeeded(lhs)]]
        ]
      ].concat(
        rhs.map((value) => {
          const item = value[1];
          return item[0] === "pathExpr" ? item : [
            "pathExpr",
            [
              "stepExpr",
              ["filterExpr", wrapInSequenceExprIfNeeded(item)]
            ]
          ];
        })
      );
    })
  );
  const valueExpr = d3([validateExpr, extensionExpr, simpleMapExpr]);
  const unaryExpr = d3([
    b2(
      d3([alias([MINUS], "unaryMinusOp"), alias([PLUS], "unaryPlusOp")]),
      C2(whitespace, unaryExprIndirect),
      (op, value) => [op, ["operand", value]]
    ),
    valueExpr
  ]);
  function unaryExprIndirect(input, offset) {
    return unaryExpr(input, offset);
  }
  const arrowFunctionSpecifier = d3([
    i3(eqName, (x2) => ["EQName", ...x2]),
    varRef2,
    parenthesizedExpr
  ]);
  const arrowExpr2 = b2(
    unaryExpr,
    p2(
      precededMultiple(
        [whitespace, ARROW, whitespace],
        b2(
          arrowFunctionSpecifier,
          C2(whitespace, argumentList),
          (specifier, argList) => [specifier, argList]
        )
      )
    ),
    (argExpr, functionParts) => functionParts.reduce(
      (arg, part) => ["arrowExpr", ["argExpr", arg], part[0], ["arguments", ...part[1]]],
      argExpr
    )
  );
  const castExpr = b2(
    arrowExpr2,
    v2(
      precededMultiple(
        [
          whitespace,
          CAST,
          whitespacePlus,
          AS,
          assertAdjacentOpeningTerminal,
          whitespace
        ],
        singleType
      )
    ),
    (lhs, rhs) => rhs !== null ? ["castExpr", ["argExpr", lhs], rhs] : lhs
  );
  const castableExpr = b2(
    castExpr,
    v2(
      precededMultiple(
        [
          whitespace,
          CASTABLE,
          whitespacePlus,
          AS,
          assertAdjacentOpeningTerminal,
          whitespace
        ],
        singleType
      )
    ),
    (lhs, rhs) => rhs !== null ? ["castableExpr", ["argExpr", lhs], rhs] : lhs
  );
  const treatExpr = b2(
    castableExpr,
    v2(
      precededMultiple(
        [
          whitespace,
          TREAT,
          whitespacePlus,
          AS,
          assertAdjacentOpeningTerminal,
          whitespace
        ],
        sequenceType
      )
    ),
    (lhs, rhs) => rhs !== null ? ["treatExpr", ["argExpr", lhs], ["sequenceType", ...rhs]] : lhs
  );
  const instanceofExpr = b2(
    treatExpr,
    v2(
      precededMultiple(
        [
          whitespace,
          INSTANCE,
          whitespacePlus,
          OF,
          assertAdjacentOpeningTerminal,
          whitespace
        ],
        sequenceType
      )
    ),
    (lhs, rhs) => rhs !== null ? ["instanceOfExpr", ["argExpr", lhs], ["sequenceType", ...rhs]] : lhs
  );
  const intersectExpr = binaryOperator2(
    instanceofExpr,
    S2(
      d3([alias([INTERSECT], "intersectOp"), alias([EXCEPT], "exceptOp")]),
      assertAdjacentOpeningTerminal
    ),
    defaultBinaryOperatorFn
  );
  const unionExpr = binaryOperator2(
    intersectExpr,
    d3([
      alias([VERTICAL_BAR], "unionOp"),
      S2(alias([UNION], "unionOp"), assertAdjacentOpeningTerminal)
    ]),
    defaultBinaryOperatorFn
  );
  const otherwiseExpr = binaryOperator2(
    unionExpr,
    S2(alias([OTHERWISE], "otherwiseOp"), D2(assertAdjacentOpeningTerminal)),
    defaultBinaryOperatorFn
  );
  const multiplicativeExpr = binaryOperator2(
    options.version >= 4 ? otherwiseExpr : unionExpr,
    d3([
      alias([ASTERIX], "multiplyOp"),
      S2(alias([DIV], "divOp"), assertAdjacentOpeningTerminal),
      S2(alias([IDIV], "idivOp"), assertAdjacentOpeningTerminal),
      S2(alias([MOD], "modOp"), assertAdjacentOpeningTerminal)
    ]),
    defaultBinaryOperatorFn
  );
  const additiveExpr = binaryOperator2(
    multiplicativeExpr,
    d3([alias([MINUS], "subtractOp"), alias([PLUS], "addOp")]),
    defaultBinaryOperatorFn
  );
  const rangeExpr = nonRepeatableBinaryOperator(
    additiveExpr,
    S2(alias([TO], "rangeSequenceExpr"), assertAdjacentOpeningTerminal),
    "startExpr",
    "endExpr"
  );
  const stringConcatExpr = binaryOperator2(
    rangeExpr,
    alias([VERTICAL_BAR_DOUBLE], "stringConcatenateOp"),
    defaultBinaryOperatorFn
  );
  const comparisonExpr = nonRepeatableBinaryOperator(
    stringConcatExpr,
    d3([valueCompare2, nodeCompare2, generalCompare2])
  );
  const andExpr = binaryOperator2(
    comparisonExpr,
    S2(alias([AND], "andOp"), assertAdjacentOpeningTerminal),
    defaultBinaryOperatorFn
  );
  const orExpr = binaryOperator2(
    andExpr,
    S2(alias([OR], "orOp"), assertAdjacentOpeningTerminal),
    defaultBinaryOperatorFn
  );
  const ifClause = wrapInStackTrace(i3(expr, (x2) => ["ifClause", x2]));
  const thenClause = wrapInStackTrace(i3(exprSingle, (x2) => ["thenClause", x2]));
  const elseClause = wrapInStackTrace(i3(exprSingle, (x2) => ["elseClause", x2]));
  const ifExpr = b2(
    b2(
      precededMultiple([IF, whitespace, BRACE_OPEN, whitespace], ifClause),
      precededMultiple(
        [
          whitespace,
          BRACE_CLOSE,
          whitespace,
          THEN,
          assertAdjacentOpeningTerminal,
          whitespace
        ],
        thenClause
      ),
      (ifClause2, thenClause2) => [ifClause2, thenClause2]
    ),
    precededMultiple(
      [whitespace, ELSE, assertAdjacentOpeningTerminal, whitespace],
      elseClause
    ),
    (ifthen, elseClause2) => {
      return ["ifThenElseExpr", ifthen[0], ifthen[1], elseClause2];
    }
  );
  const allowingEmpty = $2(ALLOWING, whitespacePlus, EMPTY);
  const positionalVar = i3(
    precededMultiple([AT, whitespacePlus, DOLLAR], varName),
    (x2) => ["positionalVariableBinding", ...x2]
  );
  const forBinding = then5(
    C2(DOLLAR, D2(varName)),
    D2(C2(whitespace, v2(typeDeclaration))),
    D2(C2(whitespace, v2(allowingEmpty))),
    D2(C2(whitespace, v2(positionalVar))),
    D2(C2(surrounded(IN, whitespace), exprSingle)),
    (variableName, typeDecl, empty, pos, forExpr) => [
      "forClauseItem",
      [
        "typedVariableBinding",
        ["varName", ...variableName, ...typeDecl ? [typeDecl] : []]
      ],
      ...empty ? [["allowingEmpty"]] : [],
      ...pos ? [pos] : [],
      ["forExpr", forExpr]
    ]
  );
  const forClause2 = precededMultiple(
    [FOR, whitespacePlus],
    binaryOperator2(forBinding, COMMA, (lhs, rhs) => [
      "forClause",
      lhs,
      ...rhs.map((x2) => x2[1])
    ])
  );
  const letBinding = then3(
    C2(DOLLAR, varName),
    C2(whitespace, v2(typeDeclaration)),
    C2(surrounded(WALRUS, whitespace), exprSingle),
    (variableName, typeDecl, letExpr) => [
      "letClauseItem",
      ["typedVariableBinding", ["varName", ...variableName], ...typeDecl ? [typeDecl] : []],
      ["letExpr", letExpr]
    ]
  );
  const letClause2 = i3(
    precededMultiple(
      [LET, whitespace],
      binaryOperator2(letBinding, COMMA, (lhs, rhs) => [lhs, ...rhs.map((x2) => x2[1])])
    ),
    (x2) => ["letClause", ...x2]
  );
  const initialClause = d3([forClause2, letClause2]);
  const whereClause2 = i3(
    precededMultiple([WHERE, assertAdjacentOpeningTerminal, whitespace], exprSingle),
    (x2) => ["whereClause", x2]
  );
  const uriLiteral = stringLiteral;
  const groupingVariable = i3(C2(DOLLAR, varName), (x2) => [
    "varName",
    ...x2
  ]);
  const groupVarInitialize = b2(
    C2(whitespace, v2(typeDeclaration)),
    C2(surrounded(WALRUS, whitespace), exprSingle),
    (t4, val) => [
      "groupVarInitialize",
      ...t4 ? [["typeDeclaration", ...t4]] : [],
      ["varValue", val]
    ]
  );
  const groupingSpec = then3(
    groupingVariable,
    v2(groupVarInitialize),
    v2(
      i3(C2(surrounded(COLLATION, whitespace), uriLiteral), (x2) => [
        "collation",
        x2
      ])
    ),
    (variableName, init, col) => ["groupingSpec", variableName, ...init ? [init] : [], ...col ? [col] : []]
  );
  const groupingSpecList = binaryOperator2(
    groupingSpec,
    COMMA,
    (lhs, rhs) => [lhs, ...rhs.map((x2) => x2[1])]
  );
  const groupByClause = i3(
    precededMultiple([GROUP, whitespacePlus, BY, whitespace], groupingSpecList),
    (x2) => ["groupByClause", ...x2]
  );
  const orderModifier = then3(
    v2(d3([ASCENDING, DESCENDING])),
    v2(
      precededMultiple(
        [whitespace, EMPTY, whitespace],
        d3([GREATEST, LEAST].map((x2) => i3(x2, (y2) => "empty " + y2)))
      )
    ),
    C2(
      whitespace,
      v2(precededMultiple([COLLATION, whitespace], uriLiteral))
    ),
    (kind, empty, collation) => {
      return !kind && !empty && !collation ? null : [
        "orderModifier",
        ...kind ? [["orderingKind", kind]] : [],
        ...empty ? [["emptyOrderingMode", empty]] : [],
        ...collation ? [["collation", collation]] : []
      ];
    }
  );
  const orderSpec = b2(
    exprSingle,
    C2(whitespace, orderModifier),
    (orderByExpr, modifier) => [
      "orderBySpec",
      ["orderByExpr", orderByExpr],
      ...modifier ? [modifier] : []
    ]
  );
  const orderSpecList = binaryOperator2(orderSpec, COMMA, (lhs, rhs) => [
    lhs,
    ...rhs.map((x2) => x2[1])
  ]);
  const orderByClause2 = b2(
    d3([
      i3(precededMultiple([ORDER, whitespacePlus], BY), (_2) => false),
      i3(
        precededMultiple(
          [STABLE, whitespacePlus, ORDER, whitespacePlus],
          BY
        ),
        (_2) => true
      )
    ]),
    C2(whitespace, orderSpecList),
    (stable, specList) => ["orderByClause", ...stable ? [["stable"]] : [], ...specList]
  );
  const intermediateClause = d3([
    initialClause,
    whereClause2,
    groupByClause,
    orderByClause2
  ]);
  const returnClause = i3(
    precededMultiple([RETURN, whitespace], exprSingle),
    (x2) => ["returnClause", x2]
  );
  const flworExpr = then3(
    initialClause,
    D2(p2(C2(whitespace, intermediateClause))),
    D2(C2(whitespace, returnClause)),
    (initial, intermediate, ret) => ["flworExpr", initial, ...intermediate, ret]
  );
  const sequenceTypeUnion = binaryOperator2(
    sequenceType,
    VERTICAL_BAR,
    (lhs, rhs) => rhs.length === 0 ? ["sequenceType", ...lhs] : [
      "sequenceTypeUnion",
      ["sequenceType", ...lhs],
      ...rhs.map((x2) => ["sequenceType", ...x2[1]])
    ]
  );
  const caseClause = then3(
    precededMultiple(
      [CASE, whitespace],
      v2(
        C2(DOLLAR, S2(S2(varName, whitespacePlus), AS))
      )
    ),
    C2(whitespace, sequenceTypeUnion),
    precededMultiple([whitespacePlus, RETURN, whitespacePlus], exprSingle),
    (variableName, sequence2, result) => ["typeswitchExprCaseClause"].concat(variableName ? [["variableBinding", ...variableName]] : []).concat([sequence2]).concat([["resultExpr", result]])
  );
  const typeswitchExpr2 = then4(
    C2(
      TYPESWITCH,
      surrounded(
        $2(BRACE_OPEN, surrounded(expr, whitespace), BRACE_CLOSE),
        whitespace
      )
    ),
    P2(S2(caseClause, whitespace)),
    precededMultiple(
      [DEFAULT, whitespacePlus],
      v2(C2(DOLLAR, S2(varName, whitespacePlus)))
    ),
    precededMultiple([RETURN, whitespacePlus], exprSingle),
    (args, clauses, variableName, result) => [
      "typeswitchExpr",
      ["argExpr", args],
      ...clauses,
      ["typeswitchExprDefaultClause", ...variableName || [], ["resultExpr", result]]
    ]
  );
  const quantifiedExprInClause = then3(
    C2(DOLLAR, varName),
    v2(C2(whitespacePlus, typeDeclaration)),
    C2(surrounded(IN, whitespacePlus), exprSingle),
    (variableName, type, source) => [
      "quantifiedExprInClause",
      ["typedVariableBinding", ["varName", ...variableName], ...type ? [type] : []],
      ["sourceExpr", source]
    ]
  );
  const quantifiedExprInClauses = binaryOperator2(
    quantifiedExprInClause,
    COMMA,
    (lhs, rhs) => [lhs, ...rhs.map((x2) => x2[1])]
  );
  const quantifiedExpr = then3(
    d3([SOME, EVERY]),
    C2(whitespacePlus, quantifiedExprInClauses),
    C2(surrounded(SATISFIES, whitespace), exprSingle),
    (kind, clauses, predicatePart) => [
      "quantifiedExpr",
      ["quantifier", kind],
      ...clauses,
      ["predicateExpr", predicatePart]
    ]
  );
  const targetExpr = exprSingle;
  const deleteExpr = i3(
    precededMultiple(
      [DELETE, whitespacePlus, d3([NODES, NODE]), whitespacePlus],
      targetExpr
    ),
    (x2) => ["deleteExpr", ["targetExpr", x2]]
  );
  const replaceExpr = then3(
    precededMultiple(
      [REPLACE, whitespacePlus],
      v2(precededMultiple([VALUE, whitespacePlus, OF], whitespacePlus))
    ),
    precededMultiple([NODE, whitespacePlus], targetExpr),
    C2(surrounded(WITH, whitespacePlus), exprSingle),
    (replaceValue3, target, replacementExpr) => replaceValue3 ? [
      "replaceExpr",
      ["replaceValue"],
      ["targetExpr", target],
      ["replacementExpr", replacementExpr]
    ] : ["replaceExpr", ["targetExpr", target], ["replacementExpr", replacementExpr]]
  );
  const transformCopy = b2(
    varRef2,
    C2(surrounded(WALRUS, whitespace), exprSingle),
    (ref, copySource) => ["transformCopy", ref, ["copySource", copySource]]
  );
  const copyModifyExpr = then3(
    precededMultiple(
      [COPY, whitespacePlus],
      binaryOperator2(transformCopy, COMMA, (lhs, rhs) => [
        lhs,
        ...rhs.map((x2) => x2[1])
      ])
    ),
    precededMultiple([whitespace, MODIFY, whitespacePlus], exprSingle),
    C2(surrounded(RETURN, whitespacePlus), exprSingle),
    (transformExprs, modifyExpr, returnExpr) => [
      "transformExpr",
      ["transformCopies", ...transformExprs],
      ["modifyExpr", modifyExpr],
      ["returnExpr", returnExpr]
    ]
  );
  const sourceExpr = exprSingle;
  const insertExprTargetChoice = d3([
    S2(
      i3(
        v2(
          S2(
            precededMultiple(
              [AS, whitespacePlus],
              d3([
                i3(FIRST, (_2) => ["insertAsFirst"]),
                i3(LAST, (_2) => ["insertAsLast"])
              ])
            ),
            whitespacePlus
          )
        ),
        (x2) => x2 ? ["insertInto", x2] : ["insertInto"]
      ),
      INTO
    ),
    i3(AFTER, (_2) => ["insertAfter"]),
    i3(BEFORE, (_2) => ["insertBefore"])
  ]);
  const insertExpr = then3(
    precededMultiple(
      [INSERT, whitespacePlus, d3([NODES, NODE]), whitespacePlus],
      sourceExpr
    ),
    C2(whitespacePlus, insertExprTargetChoice),
    C2(whitespacePlus, targetExpr),
    (source, ietc, target) => [
      "insertExpr",
      ["sourceExpr", source],
      ietc,
      ["targetExpr", target]
    ]
  );
  const newNameExpr = exprSingle;
  const renameExpr = b2(
    precededMultiple([RENAME, whitespacePlus, NODE, whitespace], targetExpr),
    precededMultiple([whitespacePlus, AS, whitespacePlus], newNameExpr),
    (targetExprPart, newNamePart) => [
      "renameExpr",
      ["targetExpr", targetExprPart],
      ["newNameExpr", newNamePart]
    ]
  );
  const switchCaseOperand = exprSingle;
  const switchCaseClause = b2(
    P2(
      b2(
        i3(
          precededMultiple([CASE, whitespacePlus], D2(switchCaseOperand)),
          (x2) => ["switchCaseExpr", x2]
        ),
        D2(whitespacePlus),
        (x2, _2) => x2
      )
    ),
    D2(precededMultiple([RETURN, whitespacePlus], D2(exprSingle))),
    (operands, exprPart) => ["switchExprCaseClause", ...operands, ["resultExpr", exprPart]]
  );
  const switchExpr2 = then3(
    precededMultiple([SWITCH, whitespace, BRACE_OPEN], D2(expr)),
    D2(
      precededMultiple(
        [whitespace, BRACE_CLOSE, D2(whitespace)],
        P2(S2(switchCaseClause, whitespace))
      )
    ),
    D2(
      precededMultiple(
        [DEFAULT, whitespacePlus, RETURN, whitespacePlus],
        exprSingle
      )
    ),
    (exprPart, clauses, resultExpr) => [
      "switchExpr",
      ["argExpr", exprPart],
      ...clauses,
      ["switchExprDefaultClause", ["resultExpr", resultExpr]]
    ]
  );
  function exprSingle(input, offset) {
    return wrapInStackTrace(
      d3([
        flworExpr,
        quantifiedExpr,
        switchExpr2,
        typeswitchExpr2,
        ifExpr,
        insertExpr,
        deleteExpr,
        renameExpr,
        replaceExpr,
        copyModifyExpr,
        orExpr
      ])
    )(input, offset);
  }
  function expr(input, offset) {
    return binaryOperator2(exprSingle, COMMA, (lhs, rhs) => {
      return rhs.length === 0 ? lhs : ["sequenceExpr", lhs, ...rhs.map((x2) => x2[1])];
    })(input, offset);
  }
  const queryBody = i3(expr, (x2) => ["queryBody", x2]);
  const namespaceDecl = precededMultiple(
    [DECLARE, whitespacePlus, NAMESPACE, whitespacePlus],
    D2(
      b2(
        ncName,
        C2(surrounded(EQUALS, whitespace), uriLiteral),
        (prefixPart, uri) => ["namespaceDecl", ["prefix", prefixPart], ["uri", uri]]
      )
    )
  );
  const varValue = exprSingle;
  const varDefaultValue = exprSingle;
  const varDecl = b2(
    precededMultiple(
      [VARIABLE, whitespacePlus, DOLLAR, whitespace],
      b2(varName, v2(C2(whitespace, typeDeclaration)), (namePart, t4) => [
        namePart,
        t4
      ])
    ),
    D2(
      d3([
        i3(
          precededMultiple([whitespace, WALRUS, whitespace], varValue),
          (x2) => ["varValue", x2]
        ),
        i3(
          precededMultiple(
            [whitespacePlus, EXTERNAL],
            v2(
              precededMultiple(
                [whitespace, WALRUS, whitespace],
                varDefaultValue
              )
            )
          ),
          (x2) => ["external", ...x2 ? [["varValue", x2]] : []]
        )
      ])
    ),
    ([namePart, t4], value) => ["varDecl", ["varName", ...namePart], ...t4 !== null ? [t4] : [], ...[value]]
  );
  const functionDecl = then4(
    precededMultiple(
      [
        FUNCTION,
        whitespacePlus,
        D2(
          q2(
            w3(S2(reservedFunctionNames, w3(COLON, [""])), [
              "Cannot use reserved function name"
            ])
          )
        )
      ],
      eqName
    ),
    D2(precededMultiple([whitespace, BRACE_OPEN, whitespace], v2(paramList))),
    D2(
      precededMultiple(
        [whitespace, BRACE_CLOSE],
        v2(
          precededMultiple([whitespacePlus, AS, whitespacePlus], sequenceType)
        )
      )
    ),
    D2(
      C2(
        whitespace,
        d3([
          i3(functionBody, (x2) => ["functionBody", x2]),
          i3(EXTERNAL, (_2) => ["externalDefinition"])
        ])
      )
    ),
    (namePart, paramListPart, typeDeclarations, body) => [
      "functionDecl",
      ["functionName", ...namePart],
      ["paramList", ...paramListPart || []],
      ...typeDeclarations ? [["typeDeclaration", ...typeDeclarations]] : [],
      body
    ]
  );
  const annotatedDecl = precededMultiple(
    [DECLARE, whitespacePlus],
    b2(
      p2(S2(d3([annotation, compatibilityAnnotation]), whitespacePlus)),
      d3([varDecl, functionDecl]),
      (annotations, decl) => [decl[0], ...annotations, ...decl.slice(1)]
    )
  );
  const defaultNamespaceDecl = b2(
    precededMultiple(
      [DECLARE, whitespacePlus, DEFAULT, whitespacePlus],
      d3([ELEMENT, FUNCTION])
    ),
    precededMultiple([whitespacePlus, NAMESPACE, whitespacePlus], uriLiteral),
    (elementOrFunction, uri) => [
      "defaultNamespaceDecl",
      ["defaultNamespaceCategory", elementOrFunction],
      ["uri", uri]
    ]
  );
  const schemaPrefix = d3([
    i3(
      S2(
        precededMultiple([NAMESPACE, whitespacePlus], ncName),
        C2(whitespace, EQUALS)
      ),
      (prefixPart) => ["namespacePrefix", prefixPart]
    ),
    i3(
      precededMultiple(
        [DEFAULT, whitespacePlus, ELEMENT, whitespacePlus],
        NAMESPACE
      ),
      (_2) => ["defaultElementNamespace"]
    )
  ]);
  const schemaImport = precededMultiple(
    [IMPORT, whitespacePlus, SCHEMA],
    then3(
      v2(C2(whitespacePlus, schemaPrefix)),
      C2(whitespace, uriLiteral),
      v2(
        b2(
          precededMultiple([whitespacePlus, AT, whitespacePlus], uriLiteral),
          p2(precededMultiple([whitespace, COMMA, whitespace], uriLiteral)),
          (lhs, rhs) => [lhs, ...rhs]
        )
      ),
      (prefixPart, namespace, targetLocations) => [
        "schemaImport",
        ...prefixPart ? [prefixPart] : [],
        ...[["targetNamespace", namespace]],
        ...targetLocations ? [targetLocations] : []
      ]
    )
  );
  const moduleImport = precededMultiple(
    [IMPORT, whitespacePlus, MODULE],
    then3(
      v2(
        S2(
          precededMultiple([whitespacePlus, NAMESPACE, whitespacePlus], ncName),
          C2(whitespace, EQUALS)
        )
      ),
      C2(whitespace, uriLiteral),
      v2(
        b2(
          precededMultiple([whitespacePlus, AT, whitespacePlus], uriLiteral),
          p2(precededMultiple([whitespace, COMMA, whitespace], uriLiteral)),
          (lhs, rhs) => [lhs, ...rhs]
        )
      ),
      (prefixPart, uri, _uris) => [
        // Implementing the uris part into the AST.
        "moduleImport",
        ["namespacePrefix", prefixPart],
        ["targetNamespace", uri]
      ]
    )
  );
  const importExpr = d3([schemaImport, moduleImport]);
  const defaultCollationDecl = i3(
    precededMultiple(
      [
        DECLARE,
        whitespacePlus,
        DEFAULT,
        whitespacePlus,
        COLLATION,
        whitespacePlus
      ],
      uriLiteral
    ),
    (x2) => ["defaultCollationDecl", x2]
  );
  const baseUriDecl = i3(
    precededMultiple(
      [DECLARE, whitespacePlus, BASE_URI, whitespacePlus],
      uriLiteral
    ),
    (x2) => ["baseUriDecl", x2]
  );
  const decimalFormatDecl = b2(
    precededMultiple(
      [DECLARE, whitespacePlus],
      d3([
        i3(precededMultiple([DECIMAL_FORMAT, whitespacePlus], eqName), (x2) => [
          "decimalFormatName",
          ...x2
        ]),
        i3(
          precededMultiple([DEFAULT, whitespacePlus], DECIMAL_FORMAT),
          (_2) => null
        )
      ])
    ),
    p2(
      b2(
        C2(whitespacePlus, decimalFormatPropertyName),
        C2(surrounded(EQUALS, whitespacePlus), stringLiteral),
        (namePart, value) => [
          "decimalFormatParam",
          ["decimalFormatParamName", namePart],
          ["decimalFormatParamValue", value]
        ]
      )
    ),
    (decimalFormatName, decimalFormatParams) => [
      "decimalFormatDecl",
      ...decimalFormatName ? [decimalFormatName] : [],
      ...decimalFormatParams
    ]
  );
  const setter = d3([
    boundarySpaceDecl,
    defaultCollationDecl,
    baseUriDecl,
    constructionDecl,
    orderingModeDecl,
    emptyOrderDecl,
    copyNamespacesDecl,
    decimalFormatDecl
  ]);
  const optionDecl = b2(
    precededMultiple([DECLARE, whitespacePlus, OPTION, whitespacePlus], eqName),
    C2(whitespacePlus, stringLiteral),
    (optionName, optionContents) => ["optionDecl", ["optionName", optionName], ["optionContents", optionContents]]
  );
  const contextItemDecl = b2(
    precededMultiple(
      [DECLARE, whitespacePlus, CONTEXT, whitespacePlus, ITEM],
      v2(precededMultiple([whitespacePlus, AS], itemType))
    ),
    d3([
      i3(C2(surrounded(WALRUS, whitespace), varValue), (x2) => ["varValue", x2]),
      i3(
        precededMultiple(
          [whitespacePlus, EXTERNAL],
          v2(C2(surrounded(WALRUS, whitespace), varDefaultValue))
        ),
        (_2) => ["external"]
      )
    ]),
    (itemTypePart, val) => [
      "contextItemDecl",
      ...itemTypePart ? [["contextItemType", itemTypePart]] : [],
      val
    ]
  );
  const prolog = b2(
    p2(
      S2(
        d3([defaultNamespaceDecl, setter, namespaceDecl, importExpr]),
        D2(surrounded(separator, whitespace))
      )
    ),
    p2(
      S2(
        d3([contextItemDecl, annotatedDecl, optionDecl]),
        D2(surrounded(separator, whitespace))
      )
    ),
    (moduleSettings, declarations21) => moduleSettings.length === 0 && declarations21.length === 0 ? null : ["prolog", ...moduleSettings, ...declarations21]
  );
  const moduleDecl = precededMultiple(
    [MODULE, whitespacePlus, NAMESPACE, whitespacePlus],
    b2(
      S2(ncName, surrounded(EQUALS, whitespace)),
      S2(uriLiteral, surrounded(separator, whitespace)),
      (prefixPart, uri) => ["moduleDecl", ["prefix", prefixPart], ["uri", uri]]
    )
  );
  const libraryModule = b2(
    moduleDecl,
    C2(whitespace, prolog),
    (moduleDeclPart, prologPart) => ["libraryModule", moduleDeclPart, ...prologPart ? [prologPart] : []]
  );
  const mainModule = b2(
    prolog,
    C2(whitespace, queryBody),
    (prologPart, body) => ["mainModule", ...prologPart ? [prologPart] : [], body]
  );
  const versionDeclaration = i3(
    precededMultiple(
      [XQUERY, whitespace],
      S2(
        d3([
          b2(
            C2(ENCODING, whitespacePlus),
            stringLiteral,
            (encoding) => ["encoding", encoding]
          ),
          b2(
            precededMultiple([VERSION2, whitespacePlus], stringLiteral),
            v2(
              precededMultiple(
                [whitespacePlus, ENCODING, whitespacePlus],
                stringLiteral
              )
            ),
            (version, encoding) => [
              ["version", version],
              ...encoding ? [["encoding", encoding]] : []
            ]
          )
        ]),
        C2(whitespace, separator)
      )
    ),
    (x2) => ["versionDecl", ...x2]
  );
  const module = b2(
    v2(surrounded(versionDeclaration, whitespace)),
    d3([libraryModule, mainModule]),
    (versionDecl, modulePart) => ["module", ...versionDecl ? [versionDecl] : [], ...[modulePart]]
  );
  const completeParser = G2(surrounded(module, whitespace));
  return (xpath, offset) => {
    stackTraceMap.clear();
    const result = completeParser(xpath, offset);
    let col = 1;
    let line = 1;
    for (let i4 = 0; i4 < xpath.length + 1; i4++) {
      if (stackTraceMap.has(i4)) {
        const stackTrace2 = stackTraceMap.get(i4);
        stackTrace2.line = line;
        stackTrace2.column = col;
      }
      const c3 = xpath[i4];
      if (c3 === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
    }
    return result;
  };
}
var xpathParser = generateParser({ outputDebugInfo: false, xquery: false, version: 3.1 });
var xpathDebugParser = generateParser({ outputDebugInfo: true, xquery: false, version: 3.1 });
var xqueryParser = generateParser({ outputDebugInfo: false, xquery: true, version: 3.1 });
var xqueryDebugParser = generateParser({ outputDebugInfo: true, xquery: true, version: 3.1 });
var xpath4Parser = generateParser({ outputDebugInfo: false, xquery: false, version: 4 });
var xpath4DebugParser = generateParser({ outputDebugInfo: true, xquery: false, version: 4 });
var xquery4Parser = generateParser({ outputDebugInfo: false, xquery: true, version: 4 });
var xquery4DebugParser = generateParser({ outputDebugInfo: true, xquery: true, version: 4 });
var tree = {
  xpath: {
    four: {
      debug: xpath4DebugParser,
      nodebug: xpath4Parser
    },
    three_one: {
      debug: xpathDebugParser,
      nodebug: xpathParser
    }
  },
  xquery: {
    four: {
      debug: xquery4DebugParser,
      nodebug: xquery4Parser
    },
    three_one: {
      debug: xqueryDebugParser,
      nodebug: xqueryParser
    }
  }
};
function parseUsingPrsc(xpath, options) {
  whitespaceCache.clear();
  whitespacePlusCache.clear();
  pathExprCache.clear();
  const parsersForLanguage = options.xquery ? tree.xquery : tree.xpath;
  const parsersForVersion = options.version === 4 ? parsersForLanguage.four : parsersForLanguage.three_one;
  const parser = options.outputDebugInfo ? parsersForVersion.debug : parsersForVersion.nodebug;
  return parser(xpath, 0);
}

// ../gh/fontoxpath/src/parsing/parseExpression.ts
function parseExpression(xPathString, compilationOptions) {
  const options = {
    xquery: !!compilationOptions.allowXQuery,
    outputDebugInfo: !!compilationOptions.debug,
    version: compilationOptions.version
  };
  const parseResult = parseUsingPrsc(xPathString, options);
  if (parseResult.success === true) {
    return parseResult.value;
  }
  const lines = xPathString.substring(0, parseResult.offset).split("\n");
  const line = lines[lines.length - 1];
  const column = line.length + 1;
  const positionS = { offset: parseResult.offset, line: lines.length, column };
  const positionE = {
    offset: parseResult.offset + 1,
    line: lines.length,
    column: column + 1
  };
  throw new StackTraceEntry(
    { start: positionS, end: positionE },
    "",
    "",
    new Error(
      `XPST0003: Failed to parse script. Expected ${[...new Set(parseResult.expected)]}`
    )
  );
}

// ../gh/fontoxpath/src/parsing/processProlog.ts
var RESERVED_FUNCTION_NAMESPACE_URIS = [
  "http://www.w3.org/XML/1998/namespace",
  "http://www.w3.org/2001/XMLSchema",
  "http://www.w3.org/2001/XMLSchema-instance",
  "http://www.w3.org/2005/xpath-functions",
  "http://www.w3.org/2005/xpath-functions/math",
  "http://www.w3.org/2012/xquery",
  "http://www.w3.org/2005/xpath-functions/array",
  "http://www.w3.org/2005/xpath-functions/map"
];
function processFunctionDefinition(declaration, staticContext, staticallyCompilableExpressions, compiledFunctionDeclarations, createExpressions) {
  const functionName = astHelper_default.getFirstChild(declaration, "functionName");
  const declarationPrefix = astHelper_default.getAttribute(functionName, "prefix") || "";
  let declarationNamespaceURI = astHelper_default.getAttribute(functionName, "URI");
  const declarationLocalName = astHelper_default.getTextContent(functionName);
  if (declarationNamespaceURI === null) {
    if (declarationPrefix === "") {
      declarationNamespaceURI = staticContext.registeredDefaultFunctionNamespaceURI === null ? "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */ : staticContext.registeredDefaultFunctionNamespaceURI;
    } else {
      declarationNamespaceURI = staticContext.resolveNamespace(declarationPrefix);
    }
    if (!declarationNamespaceURI && declarationPrefix) {
      throw errXPST00812(declarationPrefix);
    }
  }
  if (RESERVED_FUNCTION_NAMESPACE_URIS.includes(declarationNamespaceURI)) {
    throw errXQST0045();
  }
  const annotations = astHelper_default.getChildren(declaration, "annotation").map((annotation) => astHelper_default.getFirstChild(annotation, "annotationName"));
  const isPublicDeclaration = annotations.every(
    (annotationName) => !astHelper_default.getAttribute(annotationName, "URI") && astHelper_default.getTextContent(annotationName) !== "private"
  );
  const isUpdatingFunction = annotations.some(
    (annotationName) => !astHelper_default.getAttribute(annotationName, "URI") && astHelper_default.getTextContent(annotationName) === "updating"
  );
  if (!declarationNamespaceURI) {
    throw errXQST0060();
  }
  const returnType = astHelper_default.getTypeDeclaration(declaration);
  const params = astHelper_default.getChildren(
    astHelper_default.getFirstChild(declaration, "paramList"),
    "param"
  );
  const paramNames = params.map((param) => astHelper_default.getFirstChild(param, "varName"));
  const paramTypes = params.map((param) => astHelper_default.getTypeDeclaration(param));
  let functionDefinition;
  const functionBody = astHelper_default.getFirstChild(declaration, "functionBody");
  if (functionBody) {
    if (staticContext.lookupFunction(
      declarationNamespaceURI,
      declarationLocalName,
      paramTypes.length
    )) {
      throw errXQST0049(declarationNamespaceURI, declarationLocalName);
    }
    if (!createExpressions) {
      return;
    }
    const body = functionBody[1];
    const compiledFunctionBody = compileAstToExpression_default(body, {
      allowUpdating: false,
      allowXQuery: true
    });
    const staticContextLeaf = new StaticContext(staticContext);
    const parameterBindingNames = paramNames.map((param) => {
      let namespaceURI = astHelper_default.getAttribute(param, "URI");
      const prefix2 = astHelper_default.getAttribute(param, "prefix");
      const localName = astHelper_default.getTextContent(param);
      if (prefix2 && namespaceURI === null) {
        namespaceURI = staticContext.resolveNamespace(prefix2 || "");
      }
      return staticContextLeaf.registerVariable(namespaceURI, localName);
    });
    if (isUpdatingFunction) {
      const executeFunction = (dynamicContext, executionParameters, _staticContext, ...parameters) => {
        const scopedDynamicContext = dynamicContext.scopeWithFocus(-1, null, sequenceFactory_default.empty()).scopeWithVariableBindings(
          parameterBindingNames.reduce((paramByName, bindingName, i4) => {
            paramByName[bindingName] = createDoublyIterableSequence(parameters[i4]);
            return paramByName;
          }, /* @__PURE__ */ Object.create(null))
        );
        return compiledFunctionBody.evaluateWithUpdateList(
          scopedDynamicContext,
          executionParameters
        );
      };
      functionDefinition = {
        argumentTypes: paramTypes,
        arity: paramNames.length,
        callFunction: executeFunction,
        isExternal: false,
        isUpdating: true,
        isPublic: isPublicDeclaration,
        localName: declarationLocalName,
        namespaceURI: declarationNamespaceURI,
        returnType
      };
    } else {
      const executeFunction = (dynamicContext, executionParameters, _staticContext, ...parameters) => {
        const scopedDynamicContext = dynamicContext.scopeWithFocus(-1, null, sequenceFactory_default.empty()).scopeWithVariableBindings(
          parameterBindingNames.reduce((paramByName, bindingName, i4) => {
            paramByName[bindingName] = createDoublyIterableSequence(parameters[i4]);
            return paramByName;
          }, /* @__PURE__ */ Object.create(null))
        );
        return compiledFunctionBody.evaluateMaybeStatically(
          scopedDynamicContext,
          executionParameters
        );
      };
      functionDefinition = {
        argumentTypes: paramTypes,
        arity: paramNames.length,
        callFunction: executeFunction,
        isExternal: false,
        isUpdating: false,
        isPublic: isPublicDeclaration,
        localName: declarationLocalName,
        namespaceURI: declarationNamespaceURI,
        returnType
      };
    }
    staticallyCompilableExpressions.push({
      expression: compiledFunctionBody,
      staticContextLeaf
    });
    compiledFunctionDeclarations.push({
      arity: paramNames.length,
      expression: compiledFunctionBody,
      functionDefinition,
      localName: declarationLocalName,
      namespaceURI: declarationNamespaceURI,
      isPublic: isPublicDeclaration
    });
  } else {
    if (isUpdatingFunction) {
      throw new Error("Updating external function declarations are not supported");
    }
    const executeFunction = (dynamicContext, executionParameters, innerStaticContext, ...parameters) => {
      const actualFunctionProperties = innerStaticContext.lookupFunction(
        declarationNamespaceURI,
        declarationLocalName,
        paramNames.length,
        true
      );
      if (!actualFunctionProperties) {
        throw new Error(
          `XPST0017: Function Q{${declarationNamespaceURI}}${declarationLocalName} with arity of ${paramNames.length} not registered. ${getAlternativesAsStringFor(declarationLocalName)}`
        );
      }
      if (actualFunctionProperties.returnType.type !== returnType.type || actualFunctionProperties.argumentTypes.some(
        // TODO: what do we do with any RestArguments here?
        // It seems that callFunction in FunctionCall.ts performs a similar cast...
        (type, i4) => type.type !== paramTypes[i4].type
      )) {
        throw new Error("External function declaration types do not match actual function");
      }
      return actualFunctionProperties.callFunction(
        dynamicContext,
        executionParameters,
        innerStaticContext,
        ...parameters
      );
    };
    functionDefinition = {
      argumentTypes: paramTypes,
      arity: paramNames.length,
      callFunction: executeFunction,
      isExternal: true,
      isUpdating: false,
      localName: declarationLocalName,
      namespaceURI: declarationNamespaceURI,
      isPublic: isPublicDeclaration,
      returnType
    };
  }
  staticContext.registerFunctionDefinition(
    declarationNamespaceURI,
    declarationLocalName,
    paramNames.length,
    functionDefinition
  );
}
function processProlog(prolog, staticContext, createExpressions, moduleString) {
  const staticallyCompilableExpressions = [];
  const compiledFunctionDeclarations = [];
  astHelper_default.getChildren(prolog, "*").forEach((feature) => {
    switch (feature[0]) {
      case "moduleImport":
      case "namespaceDecl":
      case "defaultNamespaceDecl":
      case "functionDecl":
      case "varDecl":
        break;
      default:
        throw new Error(
          "Not implemented: only module imports, namespace declarations, and function declarations are implemented in XQuery modules"
        );
    }
  });
  const importedModuleNamespaces = /* @__PURE__ */ new Set();
  astHelper_default.getChildren(prolog, "moduleImport").forEach((moduleImport) => {
    const moduleImportPrefix = astHelper_default.getTextContent(
      astHelper_default.getFirstChild(moduleImport, "namespacePrefix")
    );
    const moduleImportNamespaceURI = astHelper_default.getTextContent(
      astHelper_default.getFirstChild(moduleImport, "targetNamespace")
    );
    if (importedModuleNamespaces.has(moduleImportNamespaceURI)) {
      throw errXQST0047(moduleImportNamespaceURI);
    }
    importedModuleNamespaces.add(moduleImportNamespaceURI);
    staticContext.registerNamespace(moduleImportPrefix, moduleImportNamespaceURI);
  });
  astHelper_default.getChildren(prolog, "namespaceDecl").forEach((namespaceDecl) => {
    const prefix2 = astHelper_default.getTextContent(astHelper_default.getFirstChild(namespaceDecl, "prefix"));
    const namespaceURI = astHelper_default.getTextContent(
      astHelper_default.getFirstChild(namespaceDecl, "uri")
    );
    if (prefix2 === "xml" || prefix2 === "xmlns") {
      throw errXQST0070();
    }
    if (namespaceURI === "http://www.w3.org/XML/1998/namespace" /* XML_NAMESPACE_URI */ || namespaceURI === "http://www.w3.org/2000/xmlns/" /* XMLNS_NAMESPACE_URI */) {
      throw errXQST0070();
    }
    staticContext.registerNamespace(prefix2, namespaceURI);
  });
  let defaultNamespaceFunctionDecl = null;
  let defaultNamespaceElementDecl = null;
  for (const astNode of astHelper_default.getChildren(prolog, "defaultNamespaceDecl")) {
    const category = astHelper_default.getTextContent(
      astHelper_default.getFirstChild(astNode, "defaultNamespaceCategory")
    );
    const namespaceURI = astHelper_default.getTextContent(astHelper_default.getFirstChild(astNode, "uri"));
    if (!namespaceURI) {
      throw errXQST0060();
    }
    if (namespaceURI === "http://www.w3.org/XML/1998/namespace" /* XML_NAMESPACE_URI */ || namespaceURI === "http://www.w3.org/2000/xmlns/" /* XMLNS_NAMESPACE_URI */) {
      throw errXQST0070();
    }
    if (category === "function") {
      if (defaultNamespaceFunctionDecl) {
        throw errXQST0066();
      }
      defaultNamespaceFunctionDecl = namespaceURI;
    } else if (category === "element") {
      if (defaultNamespaceElementDecl) {
        throw errXQST0066();
      }
      defaultNamespaceElementDecl = namespaceURI;
    }
  }
  if (defaultNamespaceFunctionDecl) {
    staticContext.registeredDefaultFunctionNamespaceURI = defaultNamespaceFunctionDecl;
  }
  if (defaultNamespaceElementDecl) {
    staticContext.registerNamespace("", defaultNamespaceElementDecl);
  }
  astHelper_default.getChildren(prolog, "functionDecl").forEach((declaration) => {
    processFunctionDefinition(
      declaration,
      staticContext,
      staticallyCompilableExpressions,
      compiledFunctionDeclarations,
      createExpressions
    );
  });
  const registeredVariables = [];
  astHelper_default.getChildren(prolog, "varDecl").forEach((varDecl) => {
    const varName2 = astHelper_default.getQName(astHelper_default.getFirstChild(varDecl, "varName"));
    let declarationNamespaceURI = varName2.namespaceURI;
    if (declarationNamespaceURI === null) {
      declarationNamespaceURI = staticContext.resolveNamespace(varName2.prefix);
      if (!declarationNamespaceURI && varName2.prefix) {
        throw errXPST00812(varName2.prefix);
      }
    }
    if (RESERVED_FUNCTION_NAMESPACE_URIS.includes(declarationNamespaceURI)) {
      throw errXQST0045();
    }
    const external = astHelper_default.getFirstChild(varDecl, "external");
    const getVarValue = astHelper_default.getFirstChild(varDecl, "varValue");
    let varValue;
    let compiledVariableAsExpression;
    if (external !== null) {
      const varDefaultValue = astHelper_default.getFirstChild(external, "varValue");
      if (varDefaultValue !== null) {
        varValue = astHelper_default.getFirstChild(varDefaultValue, "*");
      }
    } else if (getVarValue !== null) {
      varValue = astHelper_default.getFirstChild(getVarValue, "*");
    }
    if (registeredVariables.some(
      (registered) => registered.namespaceURI === declarationNamespaceURI && registered.localName === varName2.localName
    )) {
      throw new Error(
        `XQST0049: The variable ${declarationNamespaceURI ? `Q{${declarationNamespaceURI}}` : ""}${varName2.localName} has already been declared.`
      );
    }
    staticContext.registerVariable(declarationNamespaceURI || "", varName2.localName);
    if (!createExpressions) {
      return;
    }
    if (varValue) {
      compiledVariableAsExpression = compileAstToExpression_default(varValue, {
        allowUpdating: false,
        allowXQuery: true
      });
    }
    if (varValue && !staticContext.lookupVariableValue(declarationNamespaceURI || "", varName2.localName)) {
      let cachedVariableValue = null;
      staticContext.registerVariableDeclaration(
        declarationNamespaceURI,
        varName2.localName,
        (dynamicContext, executionParameters) => {
          if (cachedVariableValue) {
            return cachedVariableValue();
          }
          cachedVariableValue = createDoublyIterableSequence(
            compiledVariableAsExpression.evaluateMaybeStatically(
              dynamicContext,
              executionParameters
            )
          );
          return cachedVariableValue();
        }
      );
      staticallyCompilableExpressions.push({
        expression: compiledVariableAsExpression,
        staticContextLeaf: new StaticContext(staticContext)
      });
      registeredVariables.push({
        expression: compiledVariableAsExpression,
        localName: varName2.localName,
        namespaceURI: declarationNamespaceURI
      });
    }
  });
  compiledFunctionDeclarations.forEach((compiledFunctionDeclaration) => {
    if (!compiledFunctionDeclaration.functionDefinition.isUpdating && compiledFunctionDeclaration.expression.isUpdating) {
      throw errXUST0001(
        `The function Q{${compiledFunctionDeclaration.namespaceURI}}${compiledFunctionDeclaration.localName} is updating but the %updating annotation is missing.`
      );
    }
  });
  return {
    functionDeclarations: compiledFunctionDeclarations.map(
      (declaration) => declaration.functionDefinition
    ),
    variableDeclarations: registeredVariables,
    source: moduleString,
    performStaticAnalysis: (moduleContents) => {
      importedModuleNamespaces.forEach((namespaceURI) => {
        enhanceStaticContextWithModule(staticContext, namespaceURI);
      });
      staticallyCompilableExpressions.forEach(({ expression, staticContextLeaf }) => {
        importedModuleNamespaces.forEach((namespaceURI) => {
          enhanceStaticContextWithModule(staticContextLeaf, namespaceURI);
        });
        moduleContents.functionDeclarations.forEach((funDecl) => {
          if (staticContextLeaf.lookupFunction(
            funDecl.namespaceURI,
            funDecl.localName,
            funDecl.arity,
            true
          )) {
            return;
          }
          if (funDecl.isPublic) {
            staticContextLeaf.registerFunctionDefinition(
              funDecl.namespaceURI,
              funDecl.localName,
              funDecl.arity,
              funDecl
            );
          }
        });
        moduleContents.variableDeclarations.forEach((varDecl) => {
          if (staticContextLeaf.lookupVariable(varDecl.namespaceURI, varDecl.localName)) {
            return;
          }
          staticContextLeaf.registerVariable(varDecl.namespaceURI, varDecl.localName);
        });
        expression.performStaticEvaluation(staticContextLeaf);
      });
    }
  };
}

// ../gh/fontoxpath/src/parsing/staticallyCompileXPath.ts
function createExpressionFromSource(xpathSource, compilationOptions, namespaceResolver, variables, moduleImports, defaultFunctionNamespaceURI, functionNameResolver) {
  const language = compilationOptions.allowXQuery ? "XQuery" : "XPath";
  const fromCache = compilationOptions.disableCache ? null : getStaticCompilationResultFromCache(
    xpathSource,
    language,
    namespaceResolver,
    variables,
    moduleImports,
    compilationOptions.debug,
    defaultFunctionNamespaceURI,
    functionNameResolver
  );
  if (fromCache !== null) {
    return {
      state: fromCache.requiresStaticCompilation ? 1 /* COMPILED */ : 2 /* STATIC_ANALYZED */,
      expression: fromCache.expression
    };
  } else {
    const ast = typeof xpathSource === "string" ? parseExpression(xpathSource, compilationOptions) : convertXmlToAst(xpathSource);
    return {
      state: 0 /* PARSED */,
      ast
    };
  }
}
function buildExpressionFromAst(ast, compilationOptions, rootStaticContext, source) {
  const mainModule = astHelper_default.getFirstChild(ast, "mainModule");
  if (!mainModule) {
    throw new Error("Can not execute a library module.");
  }
  const prolog = astHelper_default.getFirstChild(mainModule, "prolog");
  if (prolog) {
    if (!compilationOptions.allowXQuery) {
      throw new Error(
        "XPST0003: Use of XQuery functionality is not allowed in XPath context"
      );
    }
    performStaticCompilationOnModules();
    const moduleDeclaration = processProlog(prolog, rootStaticContext, true, source);
    moduleDeclaration.performStaticAnalysis(moduleDeclaration);
  }
  const context = new AnnotationContext(rootStaticContext);
  annotateAst(ast, context);
  const queryBodyContents = astHelper_default.followPath(mainModule, ["queryBody", "*"]);
  return compileAstToExpression_default(queryBodyContents, compilationOptions);
}
function staticallyCompileXPath(selector, compilationOptions, namespaceResolver, variables, moduleImports, defaultFunctionNamespaceURI, functionNameResolver) {
  const executionSpecificStaticContext = new ExecutionSpecificStaticContext(
    namespaceResolver,
    variables,
    defaultFunctionNamespaceURI,
    functionNameResolver
  );
  const rootStaticContext = new StaticContext(executionSpecificStaticContext);
  if (Object.keys(moduleImports).length > 0) {
    performStaticCompilationOnModules();
  }
  Object.keys(moduleImports).forEach((modulePrefix) => {
    const moduleURI = moduleImports[modulePrefix];
    enhanceStaticContextWithModule(rootStaticContext, moduleURI);
    rootStaticContext.registerNamespace(modulePrefix, moduleURI);
  });
  if (typeof selector === "string") {
    selector = normalizeEndOfLines(selector);
  }
  const result = createExpressionFromSource(
    selector,
    compilationOptions,
    namespaceResolver,
    variables,
    moduleImports,
    defaultFunctionNamespaceURI,
    functionNameResolver
  );
  switch (result.state) {
    case 2 /* STATIC_ANALYZED */:
      return {
        staticContext: rootStaticContext,
        expression: result.expression
      };
    case 1 /* COMPILED */: {
      result.expression.performStaticEvaluation(rootStaticContext);
      const language = compilationOptions.allowXQuery ? "XQuery" : "XPath";
      storeStaticCompilationResultInCache(
        selector,
        language,
        executionSpecificStaticContext,
        moduleImports,
        result.expression,
        compilationOptions.debug,
        defaultFunctionNamespaceURI
      );
      return {
        staticContext: rootStaticContext,
        expression: result.expression
      };
    }
    case 0 /* PARSED */: {
      const expressionFromAst = buildExpressionFromAst(
        result.ast,
        compilationOptions,
        rootStaticContext,
        selector
      );
      expressionFromAst.performStaticEvaluation(rootStaticContext);
      if (!compilationOptions.disableCache) {
        const language = compilationOptions.allowXQuery ? "XQuery" : "XPath";
        storeStaticCompilationResultInCache(
          selector,
          language,
          executionSpecificStaticContext,
          moduleImports,
          expressionFromAst,
          compilationOptions.debug,
          defaultFunctionNamespaceURI
        );
      }
      return {
        staticContext: rootStaticContext,
        expression: expressionFromAst
      };
    }
  }
}

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_fontoxpath.ts
function getEvaluableExpressionFromValue(queryValue) {
  if (isSubtypeOf(queryValue.type, 1 /* XSSTRING */)) {
    return queryValue.value;
  }
  if (isSubtypeOf(queryValue.type, 54 /* ELEMENT */)) {
    return queryValue.value.node;
  }
  throw errXPTY0004(
    `Unable to convert selector argument of type ${valueTypeToString(
      queryValue.type
    )} to either an ${valueTypeToString(1 /* XSSTRING */)} or an ${valueTypeToString(
      54 /* ELEMENT */
    )} representing an XQueryX program while calling 'fontoxpath:evaluate'`
  );
}
function buildResultIterator(query, args, staticContext, executionParameters) {
  const queryValue = query.first();
  const variables = args.first().keyValuePairs.reduce((expandedArgs, arg) => {
    expandedArgs[arg.key.value] = createDoublyIterableSequence(arg.value());
    return expandedArgs;
  }, /* @__PURE__ */ Object.create(null));
  const contextItemSequence = variables["."] ? variables["."]() : sequenceFactory_default.empty();
  delete variables["."];
  const evaluableExpression = getEvaluableExpressionFromValue(queryValue);
  try {
    const { expression, staticContext: innerStaticContext } = staticallyCompileXPath(
      evaluableExpression,
      {
        allowUpdating: false,
        allowXQuery: true,
        debug: executionParameters.debug,
        disableCache: executionParameters.disableCache,
        version: 3.1
      },
      (prefix2) => staticContext.resolveNamespace(prefix2),
      // Set up temporary bindings for the given variables
      Object.keys(variables).reduce((vars, varName2) => {
        vars[varName2] = varName2;
        return vars;
      }, {}),
      {},
      "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
      (lexicalName, arity) => staticContext.resolveFunctionName(lexicalName, arity)
    );
    const hasContextItem = !contextItemSequence.isEmpty();
    const innerDynamicContext = new DynamicContext_default({
      contextItem: hasContextItem ? contextItemSequence.first() : null,
      contextItemIndex: hasContextItem ? 0 : -1,
      contextSequence: contextItemSequence,
      variableBindings: Object.keys(variables).reduce((variableByBindingKey, varName2) => {
        variableByBindingKey[innerStaticContext.lookupVariable(null, varName2)] = variables[varName2];
        return variableByBindingKey;
      }, /* @__PURE__ */ Object.create(null))
    });
    return {
      resultIterator: expression.evaluate(innerDynamicContext, executionParameters).value,
      evaluableExpression
    };
  } catch (error) {
    printAndRethrowError(evaluableExpression, error);
  }
}
var fontoxpathEvaluate = (_dynamicContext, executionParameters, staticContext, query, args) => {
  let resultIterator;
  let evaluableExpression;
  return sequenceFactory_default.create({
    next: () => {
      if (!resultIterator) {
        ({ resultIterator, evaluableExpression } = buildResultIterator(
          query,
          args,
          staticContext,
          executionParameters
        ));
      }
      try {
        return resultIterator.next(0 /* NONE */);
      } catch (error) {
        printAndRethrowError(evaluableExpression, error);
      }
    }
  });
};
var fontoxpathVersion = () => {
  const version = typeof VERSION === "undefined" ? "devbuild" : VERSION;
  return sequenceFactory_default.singleton(createAtomicValue(version, 1 /* XSSTRING */));
};
var declarations12 = [
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 3 /* EXACTLY_ONE */ },
      { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: fontoxpathEvaluate,
    localName: "evaluate",
    namespaceURI: "http://fontoxml.com/fontoxpath" /* FONTOXPATH_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [],
    callFunction: fontoxpathVersion,
    localName: "version",
    namespaceURI: "http://fontoxml.com/fontoxpath" /* FONTOXPATH_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  }
];
var builtInFunctions_fontoxpath_default = {
  declarations: declarations12
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_functions.ts
var fnFunctionLookup = (_dynamicContext, _executionParameters, staticContext, nameSequence, aritySequence) => {
  return zipSingleton([nameSequence, aritySequence], ([name2, arity]) => {
    const functionProperties = staticContext.lookupFunction(
      name2.value.namespaceURI,
      name2.value.localName,
      arity.value
    );
    if (functionProperties === null) {
      return sequenceFactory_default.empty();
    }
    const functionItem = new FunctionValue_default({
      argumentTypes: functionProperties.argumentTypes,
      arity: arity.value,
      localName: name2.value.localName,
      namespaceURI: name2.value.namespaceURI,
      returnType: functionProperties.returnType,
      value: functionProperties.callFunction
    });
    return sequenceFactory_default.singleton(functionItem);
  });
};
var fnFunctionName = (_dynamicContext, _executionParameters, _staticContext, functionItem) => {
  return zipSingleton([functionItem], ([functionValue]) => {
    if (functionValue.isAnonymous()) {
      return sequenceFactory_default.empty();
    }
    return sequenceFactory_default.singleton(
      createAtomicValue(functionValue.getQName(), 23 /* XSQNAME */)
    );
  });
};
var fnFunctionArity = (_dynamicContext, _executionParameters, _staticContext, functionItem) => {
  return zipSingleton([functionItem], ([functionValue]) => {
    return sequenceFactory_default.singleton(
      createAtomicValue(functionValue.getArity(), 5 /* XSINTEGER */)
    );
  });
};
var declarations13 = [
  {
    argumentTypes: [
      { type: 23 /* XSQNAME */, mult: 3 /* EXACTLY_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: fnFunctionLookup,
    localName: "function-lookup",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: {
      mult: 0 /* ZERO_OR_ONE */,
      type: 60 /* FUNCTION */
    }
  },
  {
    argumentTypes: [
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    callFunction: fnFunctionName,
    localName: "function-name",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 23 /* XSQNAME */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    callFunction: fnFunctionArity,
    localName: "function-arity",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ }
  }
];
var builtInFunctions_functions_default = {
  declarations: declarations13
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_identifiers.ts
function findDescendants(domFacade2, node, isMatch) {
  if (node.node.nodeType !== 1 /* ELEMENT_NODE */ && node.node.nodeType !== 9 /* DOCUMENT_NODE */) {
    return [];
  }
  const results = domFacade2.getChildNodePointers(node).reduce((matchingNodes, childNode) => {
    for (const descendant of findDescendants(domFacade2, childNode, isMatch)) {
      matchingNodes.push(descendant);
    }
    return matchingNodes;
  }, []);
  if (isMatch(node)) {
    results.unshift(node);
  }
  return results;
}
var fnId = (_dynamicContext, executionParameters, _staticContext, idrefSequence, targetNodeSequence) => {
  const targetNodeValue = targetNodeSequence.first();
  if (!targetNodeValue) {
    throw errXPDY0002("The context is absent, it needs to be present to use id function.");
  }
  if (!isSubtypeOf(targetNodeValue.type, 53 /* NODE */)) {
    throw errXPTY0004(
      "The context item is not a node, it needs to be node to use id function."
    );
  }
  const domFacade2 = executionParameters.domFacade;
  const isMatchingIdById = idrefSequence.getAllValues().reduce((byId, idrefValue) => {
    const idrefString = idrefValue.value;
    idrefString.split(/\s+/).forEach((id) => {
      byId[id] = true;
    });
    return byId;
  }, /* @__PURE__ */ Object.create(null));
  let documentNode = targetNodeValue.value;
  while (domFacade2.getNodeType(documentNode) !== 9 /* DOCUMENT_NODE */) {
    documentNode = domFacade2.getParentNodePointer(documentNode);
    if (documentNode === null) {
      throw new Error("FODC0001: the root node of the target node is not a document node.");
    }
  }
  const matchingNodes = findDescendants(domFacade2, documentNode, (node) => {
    if (domFacade2.getNodeType(node) !== 1 /* ELEMENT_NODE */) {
      return false;
    }
    const elementNode = node;
    const idAttribute = domFacade2.getAttribute(elementNode, "id");
    if (!idAttribute) {
      return false;
    }
    if (!isMatchingIdById[idAttribute]) {
      return false;
    }
    isMatchingIdById[idAttribute] = false;
    return true;
  });
  return sequenceFactory_default.create(matchingNodes.map((node) => createPointerValue(node, domFacade2)));
};
var fnIdref = (_dynamicContext, executionParameters, _staticContext, idSequence, targetNodeSequence) => {
  const targetNodeValue = targetNodeSequence.first();
  if (!targetNodeValue) {
    throw errXPDY0002("The context is absent, it needs to be present to use idref function.");
  }
  if (!isSubtypeOf(targetNodeValue.type, 53 /* NODE */)) {
    throw errXPTY0004(
      "The context item is not a node, it needs to be node to use idref function."
    );
  }
  const domFacade2 = executionParameters.domFacade;
  const isMatchingIdRefById = idSequence.getAllValues().reduce((byId, idValue) => {
    byId[idValue.value] = true;
    return byId;
  }, /* @__PURE__ */ Object.create(null));
  let documentNode = targetNodeValue.value;
  while (domFacade2.getNodeType(documentNode) !== 9 /* DOCUMENT_NODE */) {
    documentNode = domFacade2.getParentNodePointer(documentNode);
    if (documentNode === null) {
      throw new Error("FODC0001: the root node of the context node is not a document node.");
    }
  }
  const matchingNodes = findDescendants(domFacade2, documentNode, (node) => {
    if (domFacade2.getNodeType(node) !== 1 /* ELEMENT_NODE */) {
      return false;
    }
    const element = node;
    const idAttribute = domFacade2.getAttribute(element, "idref");
    if (!idAttribute) {
      return false;
    }
    const idRefs = idAttribute.split(/\s+/);
    return idRefs.some((idRef) => {
      return isMatchingIdRefById[idRef];
    });
  });
  return sequenceFactory_default.create(matchingNodes.map((node) => createPointerValue(node, domFacade2)));
};
var declarations14 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "id",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 53 /* NODE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 54 /* ELEMENT */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: fnId
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "id",
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 2 /* ZERO_OR_MORE */ }],
    returnType: { type: 54 /* ELEMENT */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction(dynamicContext, executionParameters, _staticContext, strings) {
      return fnId(
        dynamicContext,
        executionParameters,
        _staticContext,
        strings,
        sequenceFactory_default.singleton(dynamicContext.contextItem)
      );
    }
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "idref",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 53 /* NODE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 53 /* NODE */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: fnIdref
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "idref",
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 2 /* ZERO_OR_MORE */ }],
    returnType: { type: 53 /* NODE */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction(dynamicContext, executionParameters, _staticContext, strings) {
      return fnIdref(
        dynamicContext,
        executionParameters,
        _staticContext,
        strings,
        sequenceFactory_default.singleton(dynamicContext.contextItem)
      );
    }
  }
];
var builtInFunctions_identifiers_default = {
  declarations: declarations14,
  functions: {
    id: fnId,
    idref: fnIdref
  }
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_json.ts
function convert(obj) {
  switch (typeof obj) {
    case "object":
      if (Array.isArray(obj)) {
        return sequenceFactory_default.singleton(
          new ArrayValue_default(
            obj.map((subObject) => createDoublyIterableSequence(convert(subObject)))
          )
        );
      }
      if (obj === null) {
        return sequenceFactory_default.empty();
      }
      const objThingy = obj;
      return sequenceFactory_default.singleton(
        new MapValue_default(
          Object.keys(objThingy).map((key) => {
            return {
              key: createAtomicValue(key, 1 /* XSSTRING */),
              value: createDoublyIterableSequence(convert(objThingy[key]))
            };
          })
        )
      );
    case "number":
      return sequenceFactory_default.singleton(createAtomicValue(obj, 3 /* XSDOUBLE */));
    case "string":
      return sequenceFactory_default.singleton(createAtomicValue(obj, 1 /* XSSTRING */));
    case "boolean":
      return obj ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
    default:
      throw new Error("Unexpected type in JSON parse");
  }
}
var fnParseJson = (_dynamicContext, _executionParameters, _staticContext, jsonString) => {
  let jsObject;
  try {
    jsObject = JSON.parse(jsonString.first().value);
  } catch (_e) {
    throw new Error("FOJS0001: parsed JSON string contains illegal JSON.");
  }
  return convert(jsObject);
};
var declarations15 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "parse-json",
    argumentTypes: [{ type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }],
    returnType: { type: 59 /* ITEM */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnParseJson
  }
];
var builtInFunctions_json_default = {
  declarations: declarations15,
  functions: {
    parseJson: fnParseJson
  }
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_maps.ts
var mapMerge = (dynamicContext, executionParameters, staticContext, mapSequence, optionMap) => {
  const duplicateKey = sequenceFactory_default.singleton(
    createAtomicValue("duplicates", 1 /* XSSTRING */)
  );
  const duplicationHandlingValueSequence = builtInFunctions_maps_get_default(
    dynamicContext,
    executionParameters,
    staticContext,
    optionMap,
    duplicateKey
  );
  const duplicationHandlingStrategy = duplicationHandlingValueSequence.isEmpty() ? "use-first" : duplicationHandlingValueSequence.first().value;
  return mapSequence.mapAll(
    (allValues) => sequenceFactory_default.singleton(
      new MapValue_default(
        allValues.reduce((resultingKeyValuePairs, map) => {
          map.keyValuePairs.forEach((keyValuePair) => {
            const existingPairIndex = resultingKeyValuePairs.findIndex(
              (existingPair) => isSameMapKey(existingPair.key, keyValuePair.key)
            );
            if (existingPairIndex >= 0) {
              switch (duplicationHandlingStrategy) {
                case "reject":
                  throw new Error(
                    "FOJS0003: Duplicate encountered when merging maps."
                  );
                case "use-last":
                  resultingKeyValuePairs.splice(
                    existingPairIndex,
                    1,
                    keyValuePair
                  );
                  return;
                case "combine":
                  resultingKeyValuePairs.splice(existingPairIndex, 1, {
                    key: keyValuePair.key,
                    value: createDoublyIterableSequence(
                      sequenceFactory_default.create(
                        resultingKeyValuePairs[existingPairIndex].value().getAllValues().concat(keyValuePair.value().getAllValues())
                      )
                    )
                  });
                  return;
                case "use-any":
                case "use-first":
                default:
                  return;
              }
            }
            resultingKeyValuePairs.push(keyValuePair);
          });
          return resultingKeyValuePairs;
        }, [])
      )
    )
  );
};
var mapPut = (_dynamicContext, _executionParameters, _staticContext, mapSequence, keySequence, newValueSequence) => {
  return zipSingleton([mapSequence, keySequence], ([map, newKey]) => {
    const resultingKeyValuePairs = map.keyValuePairs.concat();
    const indexOfExistingPair = resultingKeyValuePairs.findIndex(
      (existingPair) => isSameMapKey(existingPair.key, newKey)
    );
    if (indexOfExistingPair >= 0) {
      resultingKeyValuePairs.splice(indexOfExistingPair, 1, {
        key: newKey,
        value: createDoublyIterableSequence(newValueSequence)
      });
    } else {
      resultingKeyValuePairs.push({
        key: newKey,
        value: createDoublyIterableSequence(newValueSequence)
      });
    }
    return sequenceFactory_default.singleton(new MapValue_default(resultingKeyValuePairs));
  });
};
var mapEntry = (_dynamicContext, _executionParameters, _staticContext, keySequence, value) => {
  return keySequence.map(
    (onlyKey) => new MapValue_default([{ key: onlyKey, value: createDoublyIterableSequence(value) }])
  );
};
var mapSize = (_dynamicContext, _executionParameters, _staticContext, mapSequence) => {
  return mapSequence.map(
    (onlyMap) => createAtomicValue(onlyMap.keyValuePairs.length, 5 /* XSINTEGER */)
  );
};
var mapKeys = (_dynamicContext, _executionParameters, _staticContext, mapSequence) => {
  return zipSingleton(
    [mapSequence],
    ([map]) => sequenceFactory_default.create(map.keyValuePairs.map((pair) => pair.key))
  );
};
var mapContains = (_dynamicContext, _executionParameters, _staticContext, mapSequence, keySequence) => {
  return zipSingleton([mapSequence, keySequence], ([map, key]) => {
    const doesContain = map.keyValuePairs.some(
      (pair) => isSameMapKey(pair.key, key)
    );
    return doesContain ? sequenceFactory_default.singletonTrueSequence() : sequenceFactory_default.singletonFalseSequence();
  });
};
var mapRemove = (_dynamicContext, _executionParameters, _staticContext, mapSequence, keySequence) => {
  return zipSingleton([mapSequence], ([map]) => {
    const resultingKeyValuePairs = map.keyValuePairs.concat();
    return keySequence.mapAll((keys) => {
      keys.forEach((key) => {
        const indexOfExistingPair = resultingKeyValuePairs.findIndex(
          (existingPair) => isSameMapKey(existingPair.key, key)
        );
        if (indexOfExistingPair >= 0) {
          resultingKeyValuePairs.splice(indexOfExistingPair, 1);
        }
      });
      return sequenceFactory_default.singleton(new MapValue_default(resultingKeyValuePairs));
    });
  });
};
var mapForEach = (dynamicContext, executionParameters, staticContext, mapSequence, itemSequence) => {
  return zipSingleton(
    [mapSequence, itemSequence],
    ([map, item]) => concatSequences(
      map.keyValuePairs.map(
        (keyValuePair) => item.value.call(
          void 0,
          dynamicContext,
          executionParameters,
          staticContext,
          sequenceFactory_default.singleton(keyValuePair.key),
          keyValuePair.value()
        )
      )
    )
  );
};
var declarations16 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
    localName: "contains",
    argumentTypes: [
      { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
      { type: 46 /* XSANYATOMICTYPE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: mapContains
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
    localName: "entry",
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 3 /* EXACTLY_ONE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    returnType: { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: mapEntry
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
    localName: "for-each",
    // TODO: reimplement type checking by parsing the types
    argumentTypes: [
      { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: mapForEach
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
    localName: "get",
    argumentTypes: [
      { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
      { type: 46 /* XSANYATOMICTYPE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: builtInFunctions_maps_get_default
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
    localName: "keys",
    argumentTypes: [{ type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ }],
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: mapKeys
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
    localName: "merge",
    argumentTypes: [
      { type: 61 /* MAP */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: mapMerge
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
    localName: "merge",
    argumentTypes: [{ type: 61 /* MAP */, mult: 2 /* ZERO_OR_MORE */ }],
    returnType: { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
    callFunction(dynamicContext, executionParameters, staticContext, maps) {
      return mapMerge(
        dynamicContext,
        executionParameters,
        staticContext,
        maps,
        sequenceFactory_default.singleton(
          new MapValue_default([
            {
              key: createAtomicValue("duplicates", 1 /* XSSTRING */),
              value: () => sequenceFactory_default.singleton(
                createAtomicValue("use-first", 1 /* XSSTRING */)
              )
            }
          ])
        )
      );
    }
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
    localName: "put",
    argumentTypes: [
      { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
      { type: 46 /* XSANYATOMICTYPE */, mult: 3 /* EXACTLY_ONE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    returnType: { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: mapPut
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
    localName: "remove",
    argumentTypes: [
      { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    returnType: { type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: mapRemove
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/map" /* MAP_NAMESPACE_URI */,
    localName: "size",
    argumentTypes: [{ type: 61 /* MAP */, mult: 3 /* EXACTLY_ONE */ }],
    returnType: { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: mapSize
  }
];
var builtInFunctions_maps_default = {
  declarations: declarations16,
  functions: {
    get: builtInFunctions_maps_get_default,
    merge: mapMerge,
    put: mapPut,
    size: mapSize
  }
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_math.ts
var mathPi = (_dynamicContext, _executionParameters, _staticContext) => {
  return sequenceFactory_default.singleton(createAtomicValue(Math.PI, 3 /* XSDOUBLE */));
};
var mathExp = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.pow(Math.E, onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathExp10 = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.pow(10, onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathLog = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.log(onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathLog10 = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.log10(onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathPow = (_dynamicContext, _executionParameters, _staticContext, base, exponent) => {
  return exponent.mapAll(
    ([valueY]) => base.map((valueX) => {
      if (Math.abs(valueX.value) === 1 && !Number.isFinite(valueY.value)) {
        return createAtomicValue(1, 3 /* XSDOUBLE */);
      }
      return createAtomicValue(Math.pow(valueX.value, valueY.value), 3 /* XSDOUBLE */);
    })
  );
};
var mathSqrt = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.sqrt(onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathSin = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.sin(onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathCos = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.cos(onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathTan = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.tan(onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathAsin = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.asin(onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathAcos = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.acos(onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathAtan = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.map(
    (onlyValue) => createAtomicValue(Math.atan(onlyValue.value), 3 /* XSDOUBLE */)
  );
};
var mathAtan2 = (_dynamicContext, _executionParameters, _staticContext, x2, y2) => {
  return y2.mapAll(
    ([onlyYValue]) => x2.map(
      (onlyXValue) => createAtomicValue(Math.atan2(onlyXValue.value, onlyYValue.value), 3 /* XSDOUBLE */)
    )
  );
};
var declarations17 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "pi",
    argumentTypes: [],
    returnType: { type: 3 /* XSDOUBLE */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: mathPi
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "exp",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathExp
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "exp10",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathExp10
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "log",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathLog
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "log10",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathLog10
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "pow",
    argumentTypes: [
      { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 2 /* XSNUMERIC */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathPow
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "sqrt",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathSqrt
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "sin",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathSin
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "cos",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathCos
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "tan",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathTan
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "asin",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathAsin
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "acos",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathAcos
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "atan",
    argumentTypes: [{ type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathAtan
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions/math" /* MATH_NAMESPACE_URI */,
    localName: "atan2",
    argumentTypes: [
      { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 3 /* XSDOUBLE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 3 /* XSDOUBLE */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: mathAtan2
  }
];
var builtInFunctions_math_default = {
  declarations: declarations17
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_operators.ts
var opTo = (_dynamicContext, _executionParameters, _staticContext, fromSequence, toSequence) => {
  const from = fromSequence.first();
  const to = toSequence.first();
  if (from === null || to === null) {
    return sequenceFactory_default.empty();
  }
  let fromValue = from.value;
  const toValue = to.value;
  if (fromValue > toValue) {
    return sequenceFactory_default.empty();
  }
  return sequenceFactory_default.create(
    {
      next: () => ready(createAtomicValue(fromValue++, 5 /* XSINTEGER */))
    },
    toValue - fromValue + 1
  );
};
var declarations18 = [
  {
    namespaceURI: "http://fontoxpath/operators",
    localName: "to",
    argumentTypes: [
      { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 5 /* XSINTEGER */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    returnType: { type: 5 /* XSINTEGER */, mult: 2 /* ZERO_OR_MORE */ },
    callFunction: opTo
  }
];
var builtInFunctions_operators_default = {
  declarations: declarations18,
  functions: {
    to: opTo
  }
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_qnames.ts
var fnQName = (_dynamicContext, _executionParameters, _staticContext, paramURI, paramQName) => {
  return zipSingleton([paramURI, paramQName], ([uriValue, lexicalQNameValue]) => {
    const lexicalQName = lexicalQNameValue.value;
    if (!validatePattern(lexicalQName, 23 /* XSQNAME */)) {
      throw new Error("FOCA0002: The provided QName is invalid.");
    }
    const uri = uriValue ? uriValue.value || null : null;
    if (uri === null && lexicalQName.includes(":")) {
      throw new Error(
        "FOCA0002: The URI of a QName may not be empty if a prefix is provided."
      );
    }
    if (paramURI.isEmpty()) {
      return sequenceFactory_default.singleton(
        createAtomicValue(new QName_default("", null, lexicalQName), 23 /* XSQNAME */)
      );
    }
    if (!lexicalQName.includes(":")) {
      return sequenceFactory_default.singleton(
        createAtomicValue(new QName_default("", uri, lexicalQName), 23 /* XSQNAME */)
      );
    }
    const [prefix2, localName] = lexicalQName.split(":");
    return sequenceFactory_default.singleton(
      createAtomicValue(new QName_default(prefix2, uri, localName), 23 /* XSQNAME */)
    );
  });
};
var fnPrefixFromQName = (_dynamicContext, _executionParameters, _staticContext, arg) => {
  return zipSingleton([arg], ([qname]) => {
    if (qname === null) {
      return sequenceFactory_default.empty();
    }
    const qnameValue = qname.value;
    if (!qnameValue.prefix) {
      return sequenceFactory_default.empty();
    }
    return sequenceFactory_default.singleton(createAtomicValue(qnameValue.prefix, 24 /* XSNCNAME */));
  });
};
var fnNamespaceURIFromQName = (_dynamicContext, _executionParameters, _staticContext, arg) => {
  return arg.map((qname) => {
    const qnameValue = qname.value;
    return createAtomicValue(qnameValue.namespaceURI || "", 20 /* XSANYURI */);
  });
};
var fnLocalNameFromQName = (_dynamicContext, _executionParameters, _staticContext, arg) => {
  return arg.map((qname) => {
    const qnameValue = qname.value;
    return createAtomicValue(qnameValue.localName, 24 /* XSNCNAME */);
  });
};
var declarations19 = [
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "QName",
    argumentTypes: [
      { type: 1 /* XSSTRING */, mult: 0 /* ZERO_OR_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    returnType: { type: 23 /* XSQNAME */, mult: 3 /* EXACTLY_ONE */ },
    callFunction: fnQName
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "prefix-from-QName",
    argumentTypes: [{ type: 23 /* XSQNAME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 24 /* XSNCNAME */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnPrefixFromQName
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "local-name-from-QName",
    argumentTypes: [{ type: 23 /* XSQNAME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 24 /* XSNCNAME */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnLocalNameFromQName
  },
  {
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    localName: "namespace-uri-from-QName",
    argumentTypes: [{ type: 23 /* XSQNAME */, mult: 0 /* ZERO_OR_ONE */ }],
    returnType: { type: 20 /* XSANYURI */, mult: 0 /* ZERO_OR_ONE */ },
    callFunction: fnNamespaceURIFromQName
  }
];
var builtInFunctions_qnames_default = {
  declarations: declarations19
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions_sequences.ts
function subSequence(sequence2, start, length) {
  let i4 = 1;
  const iterator = sequence2.value;
  const predictedLength = sequence2.getLength(true);
  let newSequenceLength = null;
  const startIndex = Math.max(start - 1, 0);
  if (predictedLength !== -1) {
    const endIndex = length === null ? predictedLength : Math.max(0, Math.min(predictedLength, length + (start - 1)));
    newSequenceLength = Math.max(0, endIndex - startIndex);
  }
  return sequenceFactory_default.create(
    {
      next: (hint) => {
        while (i4 < start) {
          iterator.next(hint);
          i4++;
        }
        if (length !== null && i4 >= start + length) {
          return DONE_TOKEN;
        }
        const returnableVal = iterator.next(hint);
        i4++;
        return returnableVal;
      }
    },
    newSequenceLength
  );
}
function castUntypedItemsToDouble(items) {
  return items.map((item) => {
    if (isSubtypeOf(item.type, 19 /* XSUNTYPEDATOMIC */)) {
      return castToType(item, 3 /* XSDOUBLE */);
    }
    return item;
  });
}
function castItemsForMinMax(items) {
  items = castUntypedItemsToDouble(items);
  if (items.some((item) => {
    return Number.isNaN(item.value);
  })) {
    return [createAtomicValue(NaN, 3 /* XSDOUBLE */)];
  }
  const convertResult = convertItemsToCommonType(items);
  if (!convertResult) {
    throw new Error("FORG0006: Incompatible types to be converted to a common type");
  }
  return convertResult;
}
var fnEmpty = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.switchCases({
    empty: () => sequenceFactory_default.singletonTrueSequence(),
    multiple: () => sequenceFactory_default.singletonFalseSequence(),
    singleton: () => sequenceFactory_default.singletonFalseSequence()
  });
};
var fnExists = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.switchCases({
    empty: () => sequenceFactory_default.singletonFalseSequence(),
    multiple: () => sequenceFactory_default.singletonTrueSequence(),
    singleton: () => sequenceFactory_default.singletonTrueSequence()
  });
};
var fnHead = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return subSequence(sequence2, 1, 1);
};
var fnTail = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return subSequence(sequence2, 2, null);
};
var fnInsertBefore = (_dynamicContext, _executionParameters, _staticContext, sequence2, position, inserts) => {
  if (sequence2.isEmpty()) {
    return inserts;
  }
  if (inserts.isEmpty()) {
    return sequence2;
  }
  const sequenceValue = sequence2.getAllValues();
  let effectivePosition = position.first().value - 1;
  if (effectivePosition < 0) {
    effectivePosition = 0;
  } else if (effectivePosition > sequenceValue.length) {
    effectivePosition = sequenceValue.length;
  }
  const firstHalve = sequenceValue.slice(0, effectivePosition);
  const secondHalve = sequenceValue.slice(effectivePosition);
  return sequenceFactory_default.create(firstHalve.concat(inserts.getAllValues(), secondHalve));
};
var fnRemove = (_dynamicContext, _executionParameters, _staticContext, sequence2, position) => {
  const effectivePosition = position.first().value;
  const sequenceValue = sequence2.getAllValues();
  if (!sequenceValue.length || effectivePosition < 1 || effectivePosition > sequenceValue.length) {
    return sequenceFactory_default.create(sequenceValue);
  }
  sequenceValue.splice(effectivePosition - 1, 1);
  return sequenceFactory_default.create(sequenceValue);
};
var fnReverse = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2.mapAll((allValues) => sequenceFactory_default.create(allValues.reverse()));
};
var fnSubsequence = (_dynamicContext, _executionParameters, _staticContext, sequence2, startSequence, lengthSequence) => {
  return zipSingleton([startSequence, lengthSequence], ([startVal, lengthVal]) => {
    if (startVal.value === Infinity) {
      return sequenceFactory_default.empty();
    }
    if (startVal.value === -Infinity) {
      if (lengthVal && lengthVal.value === Infinity) {
        return sequenceFactory_default.empty();
      }
      return sequence2;
    }
    if (lengthVal) {
      if (isNaN(lengthVal.value)) {
        return sequenceFactory_default.empty();
      }
      if (lengthVal.value === Infinity) {
        lengthVal = null;
      }
    }
    if (isNaN(startVal.value)) {
      return sequenceFactory_default.empty();
    }
    return subSequence(
      sequence2,
      Math.round(startVal.value),
      lengthVal ? Math.round(lengthVal.value) : null
    );
  });
};
var fnUnordered = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  return sequence2;
};
var fnDistinctValues = (dynamicContext, executionParameters, _staticContext, sequence2) => {
  const xs = atomize(sequence2, executionParameters).getAllValues();
  const equals = (x2, y2) => anyAtomicTypeDeepEqual(dynamicContext, executionParameters, _staticContext, x2, y2);
  return sequenceFactory_default.create(xs).filter((x2, i4) => xs.slice(0, i4).every((y2) => !equals(x2, y2)));
};
var fnIndexOf = (dynamicContext, executionParameters, _staticContext, sequence2, search) => {
  return search.mapAll(
    ([onlySearchValue]) => atomize(sequence2, executionParameters).map((element, i4) => {
      const compareFunction = valueCompare("eqOp", element.type, onlySearchValue.type);
      return compareFunction(element, onlySearchValue, dynamicContext) ? createAtomicValue(i4 + 1, 5 /* XSINTEGER */) : createAtomicValue(-1, 5 /* XSINTEGER */);
    }).filter((indexValue) => {
      return indexValue.value !== -1;
    })
  );
};
var fnDeepEqual = (dynamicContext, executionParameters, staticContext, parameter1, parameter2) => {
  let hasPassed = false;
  const deepEqualityIterator = builtInFunctions_sequences_deepEqual_default(
    dynamicContext,
    executionParameters,
    staticContext,
    parameter1,
    parameter2
  );
  return sequenceFactory_default.create({
    next: (_hint) => {
      if (hasPassed) {
        return DONE_TOKEN;
      }
      const result = deepEqualityIterator.next(0 /* NONE */);
      if (result.done) {
        return result;
      }
      hasPassed = true;
      return ready(createAtomicValue(result.value, 0 /* XSBOOLEAN */));
    }
  });
};
var fnCount = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  let hasPassed = false;
  return sequenceFactory_default.create({
    next: () => {
      if (hasPassed) {
        return DONE_TOKEN;
      }
      const length = sequence2.getLength();
      hasPassed = true;
      return ready(createAtomicValue(length, 5 /* XSINTEGER */));
    }
  });
};
var fnAvg = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  let items = castUntypedItemsToDouble(sequence2.getAllValues());
  items = convertItemsToCommonType(items);
  if (!items) {
    throw new Error("FORG0006: Incompatible types to be converted to a common type");
  }
  if (!items.every((item) => isSubtypeOf(item.type, 2 /* XSNUMERIC */))) {
    throw new Error("FORG0006: items passed to fn:avg are not all numeric.");
  }
  const resultValue = (items.every((item) => isSubtypeOf(item.type, 4 /* XSDECIMAL */)) ? exactDecimalSum(items.map((item) => item.value)) : items.reduce((sum, item) => {
    return sum + item.value;
  }, 0)) / items.length;
  if (items.every((item) => {
    return isSubtypeOf(item.type, 5 /* XSINTEGER */) || isSubtypeOf(item.type, 3 /* XSDOUBLE */);
  })) {
    return sequenceFactory_default.singleton(createAtomicValue(resultValue, 3 /* XSDOUBLE */));
  }
  if (items.every((item) => {
    return isSubtypeOf(item.type, 4 /* XSDECIMAL */);
  })) {
    return sequenceFactory_default.singleton(createAtomicValue(resultValue, 4 /* XSDECIMAL */));
  }
  return sequenceFactory_default.singleton(createAtomicValue(resultValue, 6 /* XSFLOAT */));
};
var fnMax = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  const items = castItemsForMinMax(sequence2.getAllValues());
  return sequenceFactory_default.singleton(
    items.reduce((max, item) => {
      return max.value < item.value ? item : max;
    })
  );
};
var fnMin = (_dynamicContext, _executionParameters, _staticContext, sequence2) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  const items = castItemsForMinMax(sequence2.getAllValues());
  return sequenceFactory_default.singleton(
    items.reduce((min, item) => {
      return min.value > item.value ? item : min;
    })
  );
};
var fnSum = (_dynamicContext, _executionParameters, _staticContext, sequence2, zero) => {
  if (sequence2.isEmpty()) {
    return zero;
  }
  let items = castUntypedItemsToDouble(sequence2.getAllValues());
  items = convertItemsToCommonType(items);
  if (!items) {
    throw new Error("FORG0006: Incompatible types to be converted to a common type");
  }
  if (!items.every((item) => isSubtypeOf(item.type, 2 /* XSNUMERIC */))) {
    throw new Error("FORG0006: items passed to fn:sum are not all numeric.");
  }
  const allDecimalNotInteger = items.every((item) => isSubtypeOf(item.type, 4 /* XSDECIMAL */)) && !items.every((item) => isSubtypeOf(item.type, 5 /* XSINTEGER */));
  const anyInexact = items.some((item) => item.inexact === true);
  const resultValue = allDecimalNotInteger && !anyInexact ? exactDecimalSum(items.map((item) => item.value)) : items.reduce((sum, item) => {
    return sum + item.value;
  }, 0);
  if (items.every((item) => {
    return isSubtypeOf(item.type, 5 /* XSINTEGER */);
  })) {
    return sequenceFactory_default.singleton(createAtomicValue(resultValue, 5 /* XSINTEGER */));
  }
  if (items.every((item) => {
    return isSubtypeOf(item.type, 3 /* XSDOUBLE */);
  })) {
    return sequenceFactory_default.singleton(createAtomicValue(resultValue, 3 /* XSDOUBLE */));
  }
  if (items.every((item) => {
    return isSubtypeOf(item.type, 4 /* XSDECIMAL */);
  })) {
    const decimalSum = createAtomicValue(resultValue, 4 /* XSDECIMAL */);
    if (anyInexact) decimalSum.inexact = true;
    return sequenceFactory_default.singleton(decimalSum);
  }
  return sequenceFactory_default.singleton(createAtomicValue(resultValue, 6 /* XSFLOAT */));
};
var fnZeroOrOne = (_dynamicContext, _executionParameters, _staticContext, arg) => {
  if (!arg.isEmpty() && !arg.isSingleton()) {
    throw new Error(
      "FORG0003: The argument passed to fn:zero-or-one contained more than one item."
    );
  }
  return arg;
};
var fnOneOrMore = (_dynamicContext, _executionParameters, _staticContext, arg) => {
  if (arg.isEmpty()) {
    throw new Error("FORG0004: The argument passed to fn:one-or-more was empty.");
  }
  return arg;
};
var fnExactlyOne = (_dynamicContext, _executionParameters, _staticContext, arg) => {
  if (!arg.isSingleton()) {
    throw new Error(
      "FORG0005: The argument passed to fn:exactly-one is empty or contained more than one item."
    );
  }
  return arg;
};
var fnFilter = (dynamicContext, executionParameters, staticContext, sequence2, callbackSequence) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  const callbackFn = callbackSequence.first();
  const callbackArgumentTypes = callbackFn.getArgumentTypes();
  if (callbackArgumentTypes.length !== 1) {
    throw new Error(`XPTY0004: signature of function passed to fn:filter is incompatible.`);
  }
  return sequence2.filter((item) => {
    const transformedArgument = performFunctionConversion(
      callbackArgumentTypes[0],
      sequenceFactory_default.singleton(item),
      executionParameters,
      "fn:filter",
      false
    );
    const functionCallResult = callbackFn.value.call(
      void 0,
      dynamicContext,
      executionParameters,
      staticContext,
      transformedArgument
    );
    if (!functionCallResult.isSingleton() || !isSubtypeOf(functionCallResult.first().type, 0 /* XSBOOLEAN */)) {
      throw new Error(`XPTY0004: signature of function passed to fn:filter is incompatible.`);
    }
    return functionCallResult.first().value;
  });
};
var fnForEach = (dynamicContext, executionParameters, staticContext, sequence2, callbackSequence) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  const callbackFn = callbackSequence.first();
  const callbackArgumentTypes = callbackFn.getArgumentTypes();
  if (callbackArgumentTypes.length !== 1) {
    throw new Error(`XPTY0004: signature of function passed to fn:for-each is incompatible.`);
  }
  const outerIterator = sequence2.value;
  let innerIterator;
  return sequenceFactory_default.create({
    next: (hint) => {
      while (true) {
        if (!innerIterator) {
          const item = outerIterator.next(0 /* NONE */);
          if (item.done) {
            return item;
          }
          const transformedArgument = performFunctionConversion(
            callbackArgumentTypes[0],
            sequenceFactory_default.singleton(item.value),
            executionParameters,
            "fn:for-each",
            false
          );
          const nextSequence = callbackFn.value.call(
            void 0,
            dynamicContext,
            executionParameters,
            staticContext,
            transformedArgument
          );
          innerIterator = nextSequence.value;
        }
        const entry = innerIterator.next(hint);
        if (!entry.done) {
          return entry;
        }
        innerIterator = null;
      }
    }
  });
};
var fnFoldLeft = (dynamicContext, executionParameters, staticContext, sequence2, zero, callbackSequence) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  const callbackFn = callbackSequence.first();
  const callbackArgumentTypes = callbackFn.getArgumentTypes();
  if (callbackArgumentTypes.length !== 2) {
    throw new Error(`XPTY0004: signature of function passed to fn:fold-left is incompatible.`);
  }
  return sequence2.mapAll(
    (values) => values.reduce((previous, current) => {
      const previousArg = performFunctionConversion(
        callbackArgumentTypes[0],
        previous,
        executionParameters,
        "fn:fold-left",
        false
      );
      const currentArg = performFunctionConversion(
        callbackArgumentTypes[1],
        sequenceFactory_default.singleton(current),
        executionParameters,
        "fn:fold-left",
        false
      );
      return callbackFn.value.call(
        void 0,
        dynamicContext,
        executionParameters,
        staticContext,
        previousArg,
        currentArg
      );
    }, zero)
  );
};
var fnFoldRight = (dynamicContext, executionParameters, staticContext, sequence2, zero, callbackSequence) => {
  if (sequence2.isEmpty()) {
    return sequence2;
  }
  const callbackFn = callbackSequence.first();
  const callbackArgumentTypes = callbackFn.getArgumentTypes();
  if (callbackArgumentTypes.length !== 2) {
    throw new Error(`XPTY0004: signature of function passed to fn:fold-right is incompatible.`);
  }
  return sequence2.mapAll(
    (values) => values.reduceRight((previous, current) => {
      const previousArg = performFunctionConversion(
        callbackArgumentTypes[0],
        previous,
        executionParameters,
        "fn:fold-right",
        false
      );
      const currentArg = performFunctionConversion(
        callbackArgumentTypes[1],
        sequenceFactory_default.singleton(current),
        executionParameters,
        "fn:fold-right",
        false
      );
      return callbackFn.value.call(
        void 0,
        dynamicContext,
        executionParameters,
        staticContext,
        currentArg,
        previousArg
      );
    }, zero)
  );
};
var fnSerialize = (_dynamicContext, executionParameters, _staticContext, sequence2) => {
  if (!executionParameters.xmlSerializer) {
    throw new Error("serialize() called but no xmlSerializer set in execution parameters.");
  }
  const allResults = sequence2.getAllValues();
  if (!allResults.every((value) => {
    return isSubtypeOf(value.type, 53 /* NODE */);
  })) {
    throw new Error("Expected argument to fn:serialize to resolve to a sequence of Nodes.");
  }
  return sequenceFactory_default.singleton(
    createAtomicValue(
      allResults.map((nodeValue) => {
        return executionParameters.xmlSerializer.serializeToString(
          realizeDom(
            nodeValue.value,
            executionParameters,
            false
          )
        );
      }).join(""),
      1 /* XSSTRING */
    )
  );
};
var declarations20 = [
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnEmpty,
    localName: "empty",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnExists,
    localName: "exists",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnHead,
    localName: "head",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnTail,
    localName: "tail",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    callFunction: fnInsertBefore,
    localName: "insert-before",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: fnRemove,
    localName: "remove",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnReverse,
    localName: "reverse",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 3 /* XSDOUBLE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: ((dynamicContext, executionParameters, _staticContext, sequence2, start) => fnSubsequence(
      dynamicContext,
      executionParameters,
      _staticContext,
      sequence2,
      start,
      sequenceFactory_default.empty()
    )),
    localName: "subsequence",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 3 /* XSDOUBLE */, mult: 3 /* EXACTLY_ONE */ },
      { type: 3 /* XSDOUBLE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: fnSubsequence,
    localName: "subsequence",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnUnordered,
    localName: "unordered",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    callFunction: fnDistinctValues,
    localName: "distinct-values",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction() {
      throw new Error("FOCH0002: No collations are supported");
    },
    localName: "distinct-values",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 46 /* XSANYATOMICTYPE */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction: fnIndexOf,
    localName: "index-of",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 5 /* XSINTEGER */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 46 /* XSANYATOMICTYPE */, mult: 3 /* EXACTLY_ONE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction() {
      throw new Error("FOCH0002: No collations are supported");
    },
    localName: "index-of",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 5 /* XSINTEGER */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    callFunction: fnDeepEqual,
    localName: "deep-equal",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction() {
      throw new Error("FOCH0002: No collations are supported");
    },
    localName: "deep-equal",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 0 /* XSBOOLEAN */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnCount,
    localName: "count",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 5 /* XSINTEGER */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    callFunction: fnAvg,
    localName: "avg",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    callFunction: fnMax,
    localName: "max",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction() {
      throw new Error("FOCH0002: No collations are supported");
    },
    localName: "max",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    callFunction: fnMin,
    localName: "min",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
    ],
    callFunction() {
      throw new Error("FOCH0002: No collations are supported");
    },
    localName: "min",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ }
    ],
    callFunction: ((dynamicContext, executionParameters, _staticContext, sequence2) => {
      return fnSum(
        dynamicContext,
        executionParameters,
        _staticContext,
        sequence2,
        sequenceFactory_default.singleton(createAtomicValue(0, 5 /* XSINTEGER */))
      );
    }),
    localName: "sum",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [
      { type: 46 /* XSANYATOMICTYPE */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
    ],
    callFunction: fnSum,
    localName: "sum",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 46 /* XSANYATOMICTYPE */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnZeroOrOne,
    localName: "zero-or-one",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 0 /* ZERO_OR_ONE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnOneOrMore,
    localName: "one-or-more",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 1 /* ONE_OR_MORE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnExactlyOne,
    localName: "exactly-one",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 3 /* EXACTLY_ONE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    callFunction: fnFilter,
    localName: "filter",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    callFunction: fnForEach,
    localName: "for-each",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    callFunction: fnFoldLeft,
    localName: "fold-left",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ },
      {
        type: 60 /* FUNCTION */,
        mult: 3 /* EXACTLY_ONE */
      }
    ],
    callFunction: fnFoldRight,
    localName: "fold-right",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }
  },
  {
    argumentTypes: [{ type: 59 /* ITEM */, mult: 2 /* ZERO_OR_MORE */ }],
    callFunction: fnSerialize,
    localName: "serialize",
    namespaceURI: "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
    returnType: { type: 1 /* XSSTRING */, mult: 3 /* EXACTLY_ONE */ }
  }
];
var builtInFunctions_sequences_default = {
  declarations: declarations20,
  functions: {
    avg: fnAvg,
    count: fnCount,
    max: fnMax,
    min: fnMin,
    reverse: fnReverse,
    sum: fnSum
  }
};

// ../gh/fontoxpath/src/expressions/functions/builtInFunctions.ts
var builtInFunctions = [].concat(
  builtInFunctions_arrays_default.declarations,
  builtInFunctions_boolean_default.declarations,
  builtInFunctions_context_default.declarations,
  builtInFunctions_dataTypeConstructors_default.declarations,
  builtInFunctions_datetime_default.declarations,
  builtInFunctions_debugging_default.declarations,
  builtInFunctions_duration_default.declarations,
  builtInFunctions_error_default.declarations,
  builtInFunctions_identifiers_default.declarations,
  builtInFunctions_json_default.declarations,
  builtInFunctions_maps_default.declarations,
  builtInFunctions_math_default.declarations,
  builtInFunctions_node_default.declarations,
  builtInFunctions_numeric_default.declarations,
  builtInFunctions_operators_default.declarations,
  builtInFunctions_qnames_default.declarations,
  builtInFunctions_sequences_default.declarations,
  builtInFunctions_string_default.declarations,
  builtInFunctions_fontoxpath_default.declarations,
  builtInFunctions_functions_default.declarations
);
var builtInFunctions_default = builtInFunctions;

// ../gh/fontoxpath/src/nodesFactory/wrapExternalNodesFactory.ts
var WrappingNodesFactory = class {
  constructor(externalNodesFactory) {
    this._externalNodesFactory = externalNodesFactory;
  }
  createAttributeNS(namespaceURI, name2) {
    return this._externalNodesFactory["createAttributeNS"](namespaceURI, name2);
  }
  createCDATASection(contents) {
    return this._externalNodesFactory["createCDATASection"](contents);
  }
  createComment(contents) {
    return this._externalNodesFactory["createComment"](contents);
  }
  createDocument() {
    return this._externalNodesFactory["createDocument"]();
  }
  createElementNS(namespaceURI, name2) {
    return this._externalNodesFactory["createElementNS"](namespaceURI, name2);
  }
  createProcessingInstruction(target, data) {
    return this._externalNodesFactory["createProcessingInstruction"](target, data);
  }
  createTextNode(contents) {
    return this._externalNodesFactory["createTextNode"](contents);
  }
};
function wrapExternalNodesFactory(externalNodesFactory) {
  return new WrappingNodesFactory(externalNodesFactory);
}

// ../gh/fontoxpath/src/types/createTypedValueFactory.ts
var IS_XPATH_VALUE_SYMBOL = /* @__PURE__ */ Symbol("IS_XPATH_VALUE_SYMBOL");
function createTypedValueFactory(sequenceTypeName) {
  return (value, domFacade2) => {
    const wrappedDomFacade = new DomFacade_default(
      domFacade2 === null ? new ExternalDomFacade() : domFacade2
    );
    const convertedValue = adaptJavaScriptValueToArrayOfXPathValues(
      wrappedDomFacade,
      value,
      stringToSequenceType(sequenceTypeName)
    );
    return {
      [IS_XPATH_VALUE_SYMBOL]: true,
      convertedValue
    };
  };
}

// ../gh/fontoxpath/src/evaluationUtils/buildEvaluationContext.ts
var generateGlobalVariableBindingName2 = (variableName) => `Q{}${variableName}[0]`;
builtInFunctions_default.forEach((builtInFunction) => {
  registerFunction(
    builtInFunction.namespaceURI,
    builtInFunction.localName,
    builtInFunction.argumentTypes,
    builtInFunction.returnType,
    builtInFunction.callFunction
  );
});
function createDefaultNamespaceResolver(contextItem) {
  if (!contextItem || typeof contextItem !== "object" || !("lookupNamespaceURI" in contextItem)) {
    return (_prefix) => null;
  }
  return (prefix2) => contextItem["lookupNamespaceURI"](prefix2 || null);
}
function createDefaultFunctionNameResolver(defaultFunctionNamespaceURI) {
  return ({ prefix: prefix2, localName }, _arity) => {
    if (!prefix2) {
      return {
        namespaceURI: defaultFunctionNamespaceURI,
        localName
      };
    }
    return null;
  };
}
function buildEvaluationContext(expression, contextItem, domFacade2, variables, externalOptions, compilationOptions) {
  if (variables === null || variables === void 0) {
    variables = variables || {};
  }
  const internalOptions = externalOptions ? {
    // eslint-disable-next-line no-console
    logger: externalOptions["logger"] || { trace: console.log.bind(console) },
    documentWriter: externalOptions["documentWriter"],
    moduleImports: externalOptions["moduleImports"],
    namespaceResolver: externalOptions["namespaceResolver"],
    functionNameResolver: externalOptions["functionNameResolver"],
    nodesFactory: externalOptions["nodesFactory"],
    xmlSerializer: externalOptions["xmlSerializer"]
  } : {
    // eslint-disable-next-line no-console
    logger: { trace: console.log.bind(console) },
    moduleImports: {},
    namespaceResolver: null,
    nodesFactory: null,
    documentWriter: null,
    xmlSerializer: null
  };
  const wrappedDomFacade = new DomFacade_default(
    domFacade2 === null ? new ExternalDomFacade() : domFacade2
  );
  const moduleImports = internalOptions.moduleImports || /* @__PURE__ */ Object.create(null);
  const namespaceResolver = internalOptions.namespaceResolver || createDefaultNamespaceResolver(contextItem);
  const defaultFunctionNamespaceURI = externalOptions["defaultFunctionNamespaceURI"] === void 0 ? "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */ : externalOptions["defaultFunctionNamespaceURI"];
  const functionNameResolver = internalOptions.functionNameResolver || createDefaultFunctionNameResolver(defaultFunctionNamespaceURI);
  const expressionAndStaticContext = staticallyCompileXPath(
    expression,
    compilationOptions,
    namespaceResolver,
    variables,
    moduleImports,
    defaultFunctionNamespaceURI,
    functionNameResolver
  );
  const contextSequence = contextItem ? adaptJavaScriptValueToSequence(wrappedDomFacade, contextItem) : sequenceFactory_default.empty();
  const nodesFactory = !internalOptions.nodesFactory && compilationOptions.allowXQuery ? new DomBackedNodesFactory(contextItem) : wrapExternalNodesFactory(internalOptions.nodesFactory);
  const documentWriter = internalOptions.documentWriter ? wrapExternalDocumentWriter(internalOptions.documentWriter) : domBackedDocumentWriter_default;
  const xmlSerializer = internalOptions.xmlSerializer;
  const variableBindings = Object.keys(variables).reduce(
    (typedVariableByName, variableName) => {
      const variable = variables[variableName];
      if (variable && typeof variable === "object" && IS_XPATH_VALUE_SYMBOL in variable) {
        const castedObject = variable;
        typedVariableByName[generateGlobalVariableBindingName2(variableName)] = () => {
          return sequenceFactory_default.create(castedObject.convertedValue);
        };
      } else {
        typedVariableByName[generateGlobalVariableBindingName2(variableName)] = () => {
          return adaptJavaScriptValueToSequence(
            wrappedDomFacade,
            variables[variableName]
          );
        };
      }
      return typedVariableByName;
    },
    /* @__PURE__ */ Object.create(null)
  );
  let dynamicContext;
  for (const binding of expressionAndStaticContext.staticContext.getVariableBindings()) {
    if (!variableBindings[binding]) {
      variableBindings[binding] = () => expressionAndStaticContext.staticContext.getVariableDeclaration(binding)(
        dynamicContext,
        executionParameters
      );
    }
  }
  dynamicContext = new DynamicContext_default({
    contextItem: contextSequence.first(),
    contextItemIndex: 0,
    contextSequence,
    variableBindings
  });
  const executionParameters = new ExecutionParameters(
    compilationOptions.debug,
    compilationOptions.disableCache,
    wrappedDomFacade,
    nodesFactory,
    documentWriter,
    externalOptions["currentContext"],
    /* @__PURE__ */ new Map(),
    internalOptions.logger,
    xmlSerializer
  );
  return {
    dynamicContext,
    executionParameters,
    expression: expressionAndStaticContext.expression
  };
}

// ../gh/fontoxpath/src/transformXPathItemToJavascriptObject.ts
function transformMapToObject(map, executionParameters) {
  const mapObj = {};
  let i4 = 0;
  let done = false;
  let transformedValueIterator = null;
  return {
    next: () => {
      if (done) {
        return DONE_TOKEN;
      }
      while (i4 < map.keyValuePairs.length) {
        const key = map.keyValuePairs[i4].key.value;
        if (!transformedValueIterator) {
          const keyValuePair = map.keyValuePairs[i4];
          const val = keyValuePair.value().switchCases({
            default: (seq) => seq,
            multiple: () => {
              throw new Error(
                `Serialization error: The value of an entry in a map is expected to be a single item or an empty sequence. Use arrays when putting multiple values in a map. The value of the key ${keyValuePair.key.value} holds multiple items`
              );
            }
          }).first();
          if (val === null) {
            mapObj[key] = null;
            i4++;
            continue;
          }
          transformedValueIterator = transformXPathItemToJavascriptObject(
            val,
            executionParameters
          );
        }
        const transformedValue = transformedValueIterator.next(0 /* NONE */);
        transformedValueIterator = null;
        mapObj[key] = transformedValue.value;
        i4++;
      }
      done = true;
      return ready(mapObj);
    }
  };
}
function transformArrayToArray(array, executionParameters) {
  const arr = [];
  let i4 = 0;
  let done = false;
  let transformedMemberGenerator = null;
  return {
    next: () => {
      if (done) {
        return DONE_TOKEN;
      }
      while (i4 < array.members.length) {
        if (!transformedMemberGenerator) {
          const val = array.members[i4]().switchCases({
            default: (seq) => seq,
            multiple: () => {
              throw new Error(
                `Serialization error: The value of an entry in an array is expected to be a single item or an empty sequence. Use nested arrays when putting multiple values in an array.`
              );
            }
          }).first();
          if (val === null) {
            arr[i4++] = null;
            continue;
          }
          transformedMemberGenerator = transformXPathItemToJavascriptObject(
            val,
            executionParameters
          );
        }
        const transformedValue = transformedMemberGenerator.next(0 /* NONE */);
        transformedMemberGenerator = null;
        arr[i4++] = transformedValue.value;
      }
      done = true;
      return ready(arr);
    }
  };
}
function transformXPathItemToJavascriptObject(value, executionParameters) {
  if (isSubtypeOf(value.type, 61 /* MAP */)) {
    return transformMapToObject(value, executionParameters);
  }
  if (isSubtypeOf(value.type, 62 /* ARRAY */)) {
    return transformArrayToArray(value, executionParameters);
  }
  if (isSubtypeOf(value.type, 23 /* XSQNAME */)) {
    const qualifiedName = value.value;
    return {
      next: () => ready(`Q{${qualifiedName.namespaceURI || ""}}${qualifiedName.localName}`)
    };
  }
  switch (value.type) {
    case 7 /* XSDATE */:
    case 8 /* XSTIME */:
    case 9 /* XSDATETIME */:
    case 11 /* XSGYEARMONTH */:
    case 12 /* XSGYEAR */:
    case 13 /* XSGMONTHDAY */:
    case 14 /* XSGMONTH */:
    case 15 /* XSGDAY */: {
      const temporalValue = value.value;
      return {
        next: () => ready(temporalValue.toJavaScriptDate())
      };
    }
    case 47 /* ATTRIBUTE */:
    case 53 /* NODE */:
    case 54 /* ELEMENT */:
    case 55 /* DOCUMENTNODE */:
    case 56 /* TEXT */:
    case 57 /* PROCESSINGINSTRUCTION */:
    case 58 /* COMMENT */: {
      const nodeValue = value.value;
      return {
        next: () => ready(realizeDom(nodeValue, executionParameters, false))
      };
    }
    default:
      return {
        next: () => ready(value.value)
      };
  }
}

// ../gh/fontoxpath/src/parsing/convertXDMReturnValue.ts
var ReturnType = /* @__PURE__ */ ((ReturnType2) => {
  ReturnType2[ReturnType2["ANY"] = 0] = "ANY";
  ReturnType2[ReturnType2["NUMBER"] = 1] = "NUMBER";
  ReturnType2[ReturnType2["STRING"] = 2] = "STRING";
  ReturnType2[ReturnType2["BOOLEAN"] = 3] = "BOOLEAN";
  ReturnType2[ReturnType2["NODES"] = 7] = "NODES";
  ReturnType2[ReturnType2["FIRST_NODE"] = 9] = "FIRST_NODE";
  ReturnType2[ReturnType2["STRINGS"] = 10] = "STRINGS";
  ReturnType2[ReturnType2["MAP"] = 11] = "MAP";
  ReturnType2[ReturnType2["ARRAY"] = 12] = "ARRAY";
  ReturnType2[ReturnType2["NUMBERS"] = 13] = "NUMBERS";
  ReturnType2[ReturnType2["ALL_RESULTS"] = 14] = "ALL_RESULTS";
  ReturnType2[ReturnType2["ASYNC_ITERATOR"] = 99] = "ASYNC_ITERATOR";
  return ReturnType2;
})(ReturnType || {});
function convertXDMReturnValue(expression, rawResults, returnType, executionParameters) {
  switch (returnType) {
    case 3 /* BOOLEAN */: {
      const ebv = rawResults.getEffectiveBooleanValue();
      return ebv;
    }
    case 2 /* STRING */: {
      const allValues = atomize(rawResults, executionParameters).getAllValues();
      if (!allValues.length) {
        return "";
      }
      return allValues.map((value) => castToType(value, 1 /* XSSTRING */).value).join(" ");
    }
    case 10 /* STRINGS */: {
      const allValues = atomize(rawResults, executionParameters).getAllValues();
      if (!allValues.length) {
        return [];
      }
      return allValues.map((value) => {
        return value.value + "";
      });
    }
    case 1 /* NUMBER */: {
      const first = rawResults.first();
      if (first === null) {
        return NaN;
      }
      if (!isSubtypeOf(first.type, 2 /* XSNUMERIC */)) {
        return NaN;
      }
      return first.value;
    }
    case 9 /* FIRST_NODE */: {
      const first = rawResults.first();
      if (first === null) {
        return null;
      }
      if (!isSubtypeOf(first.type, 53 /* NODE */)) {
        throw new Error(
          "Expected XPath " + evaluableExpressionToString(expression) + " to resolve to Node. Got " + valueTypeToString(first.type)
        );
      }
      return realizeDom(
        first.value,
        executionParameters,
        false
      );
    }
    case 7 /* NODES */: {
      const allResults = rawResults.getAllValues();
      if (!allResults.every((value) => {
        return isSubtypeOf(value.type, 53 /* NODE */);
      })) {
        throw new Error(
          "Expected XPath " + evaluableExpressionToString(expression) + " to resolve to a sequence of Nodes."
        );
      }
      return allResults.map((nodeValue) => {
        return realizeDom(
          nodeValue.value,
          executionParameters,
          false
        );
      });
    }
    case 11 /* MAP */: {
      const allValues = rawResults.getAllValues();
      if (allValues.length !== 1) {
        throw new Error(
          "Expected XPath " + evaluableExpressionToString(expression) + " to resolve to a single map."
        );
      }
      const first = allValues[0];
      if (!isSubtypeOf(first.type, 61 /* MAP */)) {
        throw new Error(
          "Expected XPath " + evaluableExpressionToString(expression) + " to resolve to a map"
        );
      }
      const transformedMap = transformMapToObject(
        first,
        executionParameters
      ).next(0 /* NONE */);
      return transformedMap.value;
    }
    case 12 /* ARRAY */: {
      const allValues = rawResults.getAllValues();
      if (allValues.length !== 1) {
        throw new Error(
          "Expected XPath " + evaluableExpressionToString(expression) + " to resolve to a single array."
        );
      }
      const first = allValues[0];
      if (!isSubtypeOf(first.type, 62 /* ARRAY */)) {
        throw new Error(
          "Expected XPath " + evaluableExpressionToString(expression) + " to resolve to an array"
        );
      }
      const transformedArray = transformArrayToArray(
        first,
        executionParameters
      ).next(0 /* NONE */);
      return transformedArray.value;
    }
    case 13 /* NUMBERS */: {
      const allValues = rawResults.getAllValues();
      return allValues.map((value) => {
        if (!isSubtypeOf(value.type, 2 /* XSNUMERIC */)) {
          throw new Error(
            "Expected XPath " + evaluableExpressionToString(expression) + " to resolve to numbers"
          );
        }
        return value.value;
      });
    }
    case 99 /* ASYNC_ITERATOR */: {
      const it = rawResults.value;
      let transformedValueGenerator = null;
      let done = false;
      const getNextResult = () => {
        while (!done) {
          if (!transformedValueGenerator) {
            const value = it.next(0 /* NONE */);
            if (value.done) {
              done = true;
              break;
            }
            transformedValueGenerator = transformXPathItemToJavascriptObject(
              value.value,
              executionParameters
            );
          }
          const transformedValue = transformedValueGenerator.next(0 /* NONE */);
          transformedValueGenerator = null;
          return transformedValue;
        }
        return Promise.resolve({
          done: true,
          value: null
        });
      };
      const toReturn = "asyncIterator" in Symbol ? {
        [Symbol.asyncIterator]() {
          return this;
        },
        next: () => new Promise(
          (resolve) => resolve(getNextResult())
        ).catch((error) => {
          printAndRethrowError(expression, error);
        })
      } : {
        next: () => new Promise((resolve) => resolve(getNextResult()))
      };
      return toReturn;
    }
    case 14 /* ALL_RESULTS */: {
      const allValues = rawResults.getAllValues();
      return allValues.map((value) => {
        return transformXPathItemToJavascriptObject(value, executionParameters).next(
          0 /* NONE */
        ).value;
      });
    }
    default: {
      const allValues = rawResults.getAllValues();
      const allValuesAreNodes = allValues.every((value) => {
        return isSubtypeOf(value.type, 53 /* NODE */) && !isSubtypeOf(value.type, 47 /* ATTRIBUTE */);
      });
      if (allValuesAreNodes) {
        const allResults = allValues.map((nodeValue) => {
          return realizeDom(nodeValue.value, executionParameters, false);
        });
        if (allResults.length === 1) {
          return allResults[0];
        }
        return allResults;
      }
      if (allValues.length === 1) {
        const first = allValues[0];
        if (isSubtypeOf(first.type, 62 /* ARRAY */)) {
          const transformedArray = transformArrayToArray(
            first,
            executionParameters
          ).next(0 /* NONE */);
          return transformedArray.value;
        }
        if (isSubtypeOf(first.type, 61 /* MAP */)) {
          const transformedMap = transformMapToObject(
            first,
            executionParameters
          ).next(0 /* NONE */);
          return transformedMap.value;
        }
        return atomizeSingleValue(first, executionParameters).first().value;
      }
      return atomize(sequenceFactory_default.create(allValues), executionParameters).getAllValues().map((atomizedValue) => {
        return atomizedValue.value;
      });
    }
  }
}

// ../gh/fontoxpath/src/performance.ts
var profilingEnabled = false;
var performance = null;
var profiler = {
  getPerformanceSummary() {
    const xpathEntries = performance.getEntriesByType("measure").filter((entry) => {
      return entry.name.startsWith("XPath: ");
    });
    return Array.from(
      xpathEntries.reduce((summedMeasurements, measurement) => {
        const xpath = measurement.name.substring("XPath: ".length);
        if (summedMeasurements.has(xpath)) {
          const summedMeasurement = summedMeasurements.get(xpath);
          summedMeasurement.times += 1;
          summedMeasurement.totalDuration += measurement.duration;
        } else {
          summedMeasurements.set(xpath, {
            xpath,
            times: 1,
            totalDuration: measurement.duration,
            average: 0
          });
        }
        return summedMeasurements;
      }, /* @__PURE__ */ new Map()).values()
    ).map((entry) => {
      entry.average = entry.totalDuration / entry.times;
      return entry;
    }).sort((entryA, entryB) => {
      return entryB.totalDuration - entryA.totalDuration;
    });
  },
  setPerformanceImplementation(newPerformanceImplementation) {
    performance = newPerformanceImplementation;
  },
  startProfiling() {
    if (performance === null) {
      throw new Error(
        "Performance API object must be set using `profiler.setPerformanceImplementation` before starting to profile"
      );
    }
    performance.clearMarks();
    performance.clearMeasures();
    profilingEnabled = true;
  },
  stopProfiling() {
    profilingEnabled = false;
  }
};
var xpathDepth = 0;
function buildKey(xpath) {
  return `${xpath}${xpathDepth === 0 ? "" : "@" + xpathDepth}`;
}
function markXPathStart(xpath) {
  if (!profilingEnabled) {
    return;
  }
  if (typeof xpath !== "string") {
    xpath = evaluableExpressionToString(xpath);
  }
  performance.mark(buildKey(xpath));
  xpathDepth++;
}
function markXPathEnd(xpath) {
  if (!profilingEnabled) {
    return;
  }
  if (typeof xpath !== "string") {
    xpath = evaluableExpressionToString(xpath);
  }
  xpathDepth--;
  const xpathPerfEntry = buildKey(xpath);
  performance.measure(`XPath: ${xpath}`, xpathPerfEntry);
  performance.clearMarks(xpathPerfEntry);
}

// ../gh/fontoxpath/src/types/Options.ts
var Language = /* @__PURE__ */ ((Language2) => {
  Language2["XPATH_3_1_LANGUAGE"] = "XPath3.1";
  Language2["XQUERY_3_1_LANGUAGE"] = "XQuery3.1";
  Language2["XQUERY_UPDATE_3_1_LANGUAGE"] = "XQueryUpdate3.1";
  Language2["XPATH_4_0_LANGUAGE"] = "XPath4.0";
  Language2["XQUERY_4_0_LANGUAGE"] = "XQuery4.0";
  Language2["XQUERY_UPDATE_4_0_LANGUAGE"] = "XQueryUpdate4.0";
  return Language2;
})(Language || {});

// ../gh/fontoxpath/src/evaluateXPath.ts
var evaluateXPath = (selector, contextItem, domFacade2, variables, returnType, options) => {
  returnType = returnType || 0 /* ANY */;
  if (!selector || typeof selector !== "string" && !("nodeType" in selector)) {
    throw new TypeError(
      "Failed to execute 'evaluateXPath': xpathExpression must be a string or an element depicting an XQueryX DOM tree."
    );
  }
  options = options || {};
  let dynamicContext;
  let executionParameters;
  let expression;
  try {
    const context = buildEvaluationContext(
      selector,
      contextItem,
      domFacade2 || null,
      variables || {},
      options,
      {
        allowUpdating: options["language"] === "XQueryUpdate3.1" /* XQUERY_UPDATE_3_1_LANGUAGE */,
        allowXQuery: options["language"] === "XQuery3.1" /* XQUERY_3_1_LANGUAGE */ || options["language"] === "XQueryUpdate3.1" /* XQUERY_UPDATE_3_1_LANGUAGE */,
        debug: !!options["debug"],
        disableCache: !!options["disableCache"],
        version: options["language"] === "XPath4.0" /* XPATH_4_0_LANGUAGE */ || options["language"] === "XQuery4.0" /* XQUERY_4_0_LANGUAGE */ || options["language"] === "XQueryUpdate4.0" /* XQUERY_UPDATE_4_0_LANGUAGE */ ? 4 : 3.1
      }
    );
    dynamicContext = context.dynamicContext;
    executionParameters = context.executionParameters;
    expression = context.expression;
  } catch (error) {
    printAndRethrowError(selector, error);
  }
  if (expression.isUpdating) {
    throw new Error(
      "XUST0001: Updating expressions should be evaluated as updating expressions"
    );
  }
  if (returnType === 3 /* BOOLEAN */ && contextItem && typeof contextItem === "object" && "nodeType" in contextItem) {
    const selectorBucket = expression.getBucket();
    const bucketsForNode = getBucketsForNode(contextItem);
    if (selectorBucket !== null && !bucketsForNode.includes(selectorBucket)) {
      return false;
    }
  }
  try {
    markXPathStart(selector);
    const rawResults = expression.evaluateMaybeStatically(dynamicContext, executionParameters);
    const toReturn = convertXDMReturnValue(
      selector,
      rawResults,
      returnType,
      executionParameters
    );
    markXPathEnd(selector);
    return toReturn;
  } catch (error) {
    printAndRethrowError(selector, error);
  }
};
Object.assign(evaluateXPath, {
  ALL_RESULTS_TYPE: 14 /* ALL_RESULTS */,
  ANY_TYPE: 0 /* ANY */,
  ARRAY_TYPE: 12 /* ARRAY */,
  ASYNC_ITERATOR_TYPE: 99 /* ASYNC_ITERATOR */,
  BOOLEAN_TYPE: 3 /* BOOLEAN */,
  FIRST_NODE_TYPE: 9 /* FIRST_NODE */,
  MAP_TYPE: 11 /* MAP */,
  NODES_TYPE: 7 /* NODES */,
  NUMBERS_TYPE: 13 /* NUMBERS */,
  NUMBER_TYPE: 1 /* NUMBER */,
  STRINGS_TYPE: 10 /* STRINGS */,
  STRING_TYPE: 2 /* STRING */,
  XPATH_3_1_LANGUAGE: "XPath3.1" /* XPATH_3_1_LANGUAGE */,
  XQUERY_3_1_LANGUAGE: "XQuery3.1" /* XQUERY_3_1_LANGUAGE */,
  XQUERY_UPDATE_3_1_LANGUAGE: "XQueryUpdate3.1" /* XQUERY_UPDATE_3_1_LANGUAGE */
});
Object.assign(evaluateXPath, {
  ["ALL_RESULTS_TYPE"]: 14 /* ALL_RESULTS */,
  ["ANY_TYPE"]: 0 /* ANY */,
  ["ARRAY_TYPE"]: 12 /* ARRAY */,
  ["ASYNC_ITERATOR_TYPE"]: 99 /* ASYNC_ITERATOR */,
  ["BOOLEAN_TYPE"]: 3 /* BOOLEAN */,
  ["FIRST_NODE_TYPE"]: 9 /* FIRST_NODE */,
  ["MAP_TYPE"]: 11 /* MAP */,
  ["NODES_TYPE"]: 7 /* NODES */,
  ["NUMBERS_TYPE"]: 13 /* NUMBERS */,
  ["NUMBER_TYPE"]: 1 /* NUMBER */,
  ["STRINGS_TYPE"]: 10 /* STRINGS */,
  ["STRING_TYPE"]: 2 /* STRING */,
  ["XPATH_3_1_LANGUAGE"]: "XPath3.1" /* XPATH_3_1_LANGUAGE */,
  ["XQUERY_3_1_LANGUAGE"]: "XQuery3.1" /* XQUERY_3_1_LANGUAGE */,
  ["XQUERY_UPDATE_3_1_LANGUAGE"]: "XQueryUpdate3.1" /* XQUERY_UPDATE_3_1_LANGUAGE */,
  ["XPATH_4_0_LANGUAGE"]: "XPath4.0" /* XPATH_4_0_LANGUAGE */,
  ["XQUERY_4_0_LANGUAGE"]: "XQuery4.0" /* XQUERY_4_0_LANGUAGE */
});
var evaluateXPath_default = evaluateXPath;

// ../gh/fontoxpath/src/evaluateXPathToAsyncIterator.ts
function evaluateXPathToAsyncIterator(selector, contextItem, domFacade2, variables, options) {
  return evaluateXPath_default(
    selector,
    contextItem,
    domFacade2,
    variables,
    evaluateXPath_default.ASYNC_ITERATOR_TYPE,
    options
  );
}

// ../gh/fontoxpath/src/evaluationUtils/convertUpdateResultToTransferable.ts
function convertUpdateResultToTransferable(result, script, returnType, executionParameters) {
  return {
    ["pendingUpdateList"]: result.pendingUpdateList.map(
      (update) => update.toTransferable(executionParameters)
    ),
    ["xdmValue"]: convertXDMReturnValue(
      script,
      sequenceFactory_default.create(result.xdmValue),
      returnType,
      executionParameters
    )
  };
}

// ../gh/fontoxpath/src/evaluateUpdatingExpression.ts
async function evaluateUpdatingExpression(updateScript, contextItem, domFacade2, variables, options) {
  options = options || {};
  performStaticCompilationOnModules();
  let dynamicContext;
  let executionParameters;
  let expression;
  try {
    const context = buildEvaluationContext(
      updateScript,
      contextItem,
      domFacade2 || null,
      variables || {},
      options || {},
      {
        allowUpdating: true,
        allowXQuery: true,
        debug: !!options["debug"],
        disableCache: !!options["disableCache"],
        version: options.language === "XQueryUpdate4.0" /* XQUERY_UPDATE_4_0_LANGUAGE */ ? 4 : 3.1
      }
    );
    dynamicContext = context.dynamicContext;
    executionParameters = context.executionParameters;
    expression = context.expression;
  } catch (error) {
    printAndRethrowError(updateScript, error);
  }
  if (!expression.isUpdating) {
    const resultItems = [];
    const it = evaluateXPathToAsyncIterator(updateScript, contextItem, domFacade2, variables, {
      ...options,
      language: "XQueryUpdate3.1" /* XQUERY_UPDATE_3_1_LANGUAGE */
    });
    for (let item = await it.next(); !item.done; item = await it.next()) {
      resultItems.push(item.value);
    }
    return Promise.resolve({
      ["pendingUpdateList"]: [],
      ["xdmValue"]: resultItems
    });
  }
  let attempt;
  try {
    const resultIterator = expression.evaluateWithUpdateList(
      dynamicContext,
      executionParameters
    );
    attempt = resultIterator.next(0 /* NONE */);
  } catch (error) {
    printAndRethrowError(updateScript, error);
  }
  return convertUpdateResultToTransferable(
    attempt.value,
    updateScript,
    options["returnType"],
    executionParameters
  );
}

// ../gh/fontoxpath/src/evaluateUpdatingExpressionSync.ts
function evaluateUpdatingExpressionSync(updateScript, contextItem, domFacade2, variables, options) {
  options = options || {};
  performStaticCompilationOnModules();
  let dynamicContext;
  let executionParameters;
  let expression;
  try {
    const context = buildEvaluationContext(
      updateScript,
      contextItem,
      domFacade2 || null,
      variables || {},
      options || {},
      {
        allowUpdating: true,
        allowXQuery: true,
        debug: !!options["debug"],
        disableCache: !!options["disableCache"],
        version: options.language === "XQueryUpdate4.0" /* XQUERY_UPDATE_4_0_LANGUAGE */ ? 4 : 3.1
      }
    );
    dynamicContext = context.dynamicContext;
    executionParameters = context.executionParameters;
    expression = context.expression;
  } catch (error) {
    printAndRethrowError(updateScript, error);
  }
  if (!expression.isUpdating) {
    return {
      ["pendingUpdateList"]: [],
      ["xdmValue"]: evaluateXPath_default(
        updateScript,
        contextItem,
        domFacade2,
        variables,
        options.returnType,
        { ...options, ["language"]: evaluateXPath_default.XQUERY_UPDATE_3_1_LANGUAGE }
      )
    };
  }
  let attempt;
  try {
    const resultIterator = expression.evaluateWithUpdateList(
      dynamicContext,
      executionParameters
    );
    attempt = resultIterator.next(0 /* NONE */);
  } catch (error) {
    printAndRethrowError(updateScript, error);
  }
  return convertUpdateResultToTransferable(
    attempt.value,
    updateScript,
    options["returnType"],
    executionParameters
  );
}

// ../gh/fontoxpath/src/evaluateXPathToArray.ts
function evaluateXPathToArray(selector, contextItem, domFacade2, variables, options) {
  return evaluateXPath_default(
    selector,
    contextItem,
    domFacade2,
    variables,
    evaluateXPath_default.ARRAY_TYPE,
    options
  );
}

// ../gh/fontoxpath/src/evaluateXPathToBoolean.ts
function evaluateXPathToBoolean(selector, contextItem, domFacade2, variables, options) {
  return evaluateXPath_default(
    selector,
    contextItem,
    domFacade2,
    variables,
    evaluateXPath_default.BOOLEAN_TYPE,
    options
  );
}

// ../gh/fontoxpath/src/evaluateXPathToFirstNode.ts
function evaluateXPathToFirstNode(selector, contextItem, domFacade2, variables, options) {
  return evaluateXPath_default(
    selector,
    contextItem,
    domFacade2,
    variables,
    evaluateXPath_default.FIRST_NODE_TYPE,
    options
  );
}

// ../gh/fontoxpath/src/evaluateXPathToMap.ts
function evaluateXPathToMap(selector, contextItem, domFacade2, variables, options) {
  return evaluateXPath_default(
    selector,
    contextItem,
    domFacade2,
    variables,
    evaluateXPath_default.MAP_TYPE,
    options
  );
}

// ../gh/fontoxpath/src/evaluateXPathToNodes.ts
function evaluateXPathToNodes(selector, contextItem, domFacade2, variables, options) {
  return evaluateXPath_default(
    selector,
    contextItem,
    domFacade2,
    variables,
    evaluateXPath_default.NODES_TYPE,
    options
  );
}

// ../gh/fontoxpath/src/evaluateXPathToNumber.ts
function evaluateXPathToNumber(selector, contextItem, domFacade2, variables, options) {
  return evaluateXPath_default(
    selector,
    contextItem,
    domFacade2,
    variables,
    evaluateXPath_default.NUMBER_TYPE,
    options
  );
}

// ../gh/fontoxpath/src/evaluateXPathToNumbers.ts
function evaluateXPathToNumbers(selector, contextItem, domFacade2, variables, options) {
  return evaluateXPath_default(
    selector,
    contextItem,
    domFacade2,
    variables,
    evaluateXPath_default.NUMBERS_TYPE,
    options
  );
}

// ../gh/fontoxpath/src/evaluateXPathToString.ts
function evaluateXPathToString(selector, contextItem, domFacade2, variables, options) {
  return evaluateXPath_default(
    selector,
    contextItem,
    domFacade2,
    variables,
    evaluateXPath_default.STRING_TYPE,
    options
  );
}

// ../gh/fontoxpath/src/evaluateXPathToStrings.ts
function evaluateXPathToStrings(selector, contextItem, domFacade2, variables, options) {
  return evaluateXPath_default(
    selector,
    contextItem,
    domFacade2,
    variables,
    evaluateXPath_default.STRINGS_TYPE,
    options
  );
}

// ../gh/fontoxpath/src/executePendingUpdateList.ts
function executePendingUpdateList(pendingUpdateList, domFacade2, nodesFactory, documentWriter) {
  const newDomFacade = new DomFacade_default(domFacade2 ? domFacade2 : new ExternalDomFacade());
  documentWriter = documentWriter ? wrapExternalDocumentWriter(documentWriter) : domBackedDocumentWriter_default;
  nodesFactory = nodesFactory ? nodesFactory = wrapExternalNodesFactory(nodesFactory) : null;
  const pul = pendingUpdateList.map(createPendingUpdateFromTransferable);
  applyUpdates(pul, null, null, newDomFacade, nodesFactory, documentWriter);
}

// ../gh/fontoxpath/src/jsCodegen/JavaScriptCompiledXPath.ts
function acceptAst(code, generatedCodeType, variables) {
  return {
    code,
    generatedCodeType,
    variables,
    isAstAccepted: true
  };
}
function rejectAst(reason) {
  return { isAstAccepted: false, reason };
}
function acceptFullyCompiledAst(code) {
  return { code, isAstAccepted: true };
}

// ../gh/fontoxpath/src/jsCodegen/emitHelpers.ts
function mapPartialCompilationResult(expr, cb) {
  if (!expr.isAstAccepted) {
    return expr;
  }
  return cb(expr);
}
function mapPartialCompilationResultAndBucket(expr, cb) {
  if (!expr.isAstAccepted) {
    return [expr, null];
  }
  return cb(expr);
}
function emitConversionToValue(expr, contextItemExpr2, context) {
  return mapPartialCompilationResult(expr, (expr2) => {
    switch (expr2.generatedCodeType.type) {
      case 0 /* Value */:
        return expr2;
      case 1 /* Generator */: {
        return mapPartialCompilationResult(
          context.getIdentifierFor(expr2, "nodes"),
          (expr3) => mapPartialCompilationResult(
            context.getIdentifierFor(contextItemExpr2, "contextItem"),
            (contextItemExpr3) => acceptAst(
              `(function () {
							const { done, value } = ${expr3.code}(${contextItemExpr3.code}).next();
							return done ? null : value;
						})()`,
              { type: 0 /* Value */ },
              [...expr3.variables, ...contextItemExpr3.variables]
            )
          )
        );
      }
      default:
        throw new Error(
          `invalid generated code type to convert to value: ${expr2.generatedCodeType.type}`
        );
    }
  });
}
function emitEffectiveBooleanValue(expr, astType, contextItemExpr2, context) {
  const value = emitConversionToValue(expr, contextItemExpr2, context);
  if (astType && astType.type === 0 /* XSBOOLEAN */ && astType.mult === 3 /* EXACTLY_ONE */) {
    return value;
  }
  return mapPartialCompilationResult(value, (expr2) => {
    return acceptAst(`!!${expr2.code}`, { type: 0 /* Value */ }, expr2.variables);
  });
}
function emitAtomizedValue(expr, astType, context) {
  if (!astType) {
    return rejectAst("Can not atomize value if type was not annotated");
  }
  if (expr.isAstAccepted && expr.generatedCodeType.type !== 0 /* Value */) {
    return rejectAst("Atomization only implemented for single value");
  }
  if (isSubtypeOf(astType.type, 1 /* XSSTRING */)) {
    return expr;
  }
  if (isSubtypeOf(astType.type, 47 /* ATTRIBUTE */)) {
    return mapPartialCompilationResult(
      context.getIdentifierFor(expr, "attr"),
      (expr2) => acceptAst(
        `(${expr2.code} ? domFacade.getData(${expr2.code}) : null)`,
        { type: 0 /* Value */ },
        expr2.variables
      )
    );
  }
  return rejectAst("Atomization only implemented for string and attribute");
}
function emitConversionToString(expr, astType, contextItemExpr2, context) {
  const value = emitConversionToValue(expr, contextItemExpr2, context);
  const atomized = emitAtomizedValue(value, astType, context);
  if (!doesTypeAllowEmpty(astType)) {
    return atomized;
  }
  return mapPartialCompilationResult(
    atomized,
    (atomized2) => acceptAst(
      `${atomized2.code} ?? ''`,
      { type: 0 /* Value */ },
      atomized2.variables
    )
  );
}
function emitNodeCheck(expr, astType, context) {
  return mapPartialCompilationResult(context.getIdentifierFor(expr, "node"), (expr2) => {
    if (expr2.generatedCodeType.type === 1 /* Generator */) {
      return expr2;
    }
    if (astType && !isSubtypeOf(astType.type, 53 /* NODE */)) {
      return rejectAst("Can not evaluate to node if expression does not result in nodes");
    }
    return acceptAst(
      `(function () {
				if (${expr2.code} !== null && !${expr2.code}.nodeType) {
					throw new Error('XPDY0050: The result of the expression was not a node');
				}
				return ${expr2.code};
			})()`,
      { type: 0 /* Value */ },
      expr2.variables
    );
  });
}
function emitConversionToFirstNode(expr, astType, contextItemExpr2, context) {
  const exprAsValue = emitConversionToValue(expr, contextItemExpr2, context);
  return emitNodeCheck(exprAsValue, astType, context);
}
function emitConversionToNodes(expr, astType, contextItemExpr2, context) {
  return mapPartialCompilationResult(expr, (expr2) => {
    switch (expr2.generatedCodeType.type) {
      case 1 /* Generator */:
        return mapPartialCompilationResult(
          context.getIdentifierFor(expr2, "nodes"),
          (expr3) => mapPartialCompilationResult(
            context.getIdentifierFor(contextItemExpr2, "contextItem"),
            (contextItemExpr3) => acceptAst(
              `Array.from(${expr3.code}(${contextItemExpr3.code}))`,
              { type: 0 /* Value */ },
              [...expr3.variables, ...contextItemExpr3.variables]
            )
          )
        );
      case 0 /* Value */:
        return mapPartialCompilationResult(
          context.getIdentifierFor(emitNodeCheck(expr2, astType, context), "node"),
          (expr3) => acceptAst(
            `(${expr3.code} === null ? [] : [${expr3.code}])`,
            { type: 0 /* Value */ },
            expr3.variables
          )
        );
      default:
        return rejectAst("Unsupported code type to evaluate to nodes");
    }
  });
}
function emitAnd(condition1, condition2) {
  return mapPartialCompilationResult(
    condition1,
    (condition12) => mapPartialCompilationResult(condition2, (condition22) => {
      if (condition12.generatedCodeType.type !== 0 /* Value */ || condition22.generatedCodeType.type !== 0 /* Value */) {
        throw new Error("can only use emitAnd with value expressions");
      }
      return acceptAst(
        `${condition12.code} && ${condition22.code}`,
        { type: 0 /* Value */ },
        [...condition12.variables, ...condition22.variables]
      );
    })
  );
}

// ../gh/fontoxpath/src/jsCodegen/emitOperand.ts
function emitOperand(ast, operandKind, contextItemExpr2, context) {
  const exprAst = astHelper_default.followPath(ast, [operandKind, "*"]);
  if (!exprAst) {
    return [rejectAst(`${operandKind} expression not found`), null];
  }
  return context.emitBaseExpr(exprAst, contextItemExpr2, context);
}

// ../gh/fontoxpath/src/jsCodegen/emitCompare.ts
var OPERATOR_TRANSLATION2 = {
  ["equalOp"]: "eqOp",
  ["notEqualOp"]: "neOp",
  ["lessThanOrEqualOp"]: "leOp",
  ["lessThanOp"]: "ltOp",
  ["greaterThanOrEqualOp"]: "geOp",
  ["greaterThanOp"]: "gtOp"
};
var OPERATOR_SWAP_TABLE = {
  ["eqOp"]: "eqOp",
  ["neOp"]: "neOp",
  ["leOp"]: "geOp",
  ["ltOp"]: "gtOp",
  ["geOp"]: "leOp",
  ["gtOp"]: "ltOp"
};
function emitValueCompare(ast, compareType, contextItemExpr2, context) {
  const firstType = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, ["firstOperand", "*"]),
    "type"
  );
  const secondType = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, ["secondOperand", "*"]),
    "type"
  );
  if (!firstType || !secondType) {
    return rejectAst("Can not generate code for value compare without both types");
  }
  const supportedTypes = [47 /* ATTRIBUTE */, 1 /* XSSTRING */];
  if (!supportedTypes.includes(firstType.type) || !supportedTypes.includes(secondType.type)) {
    return rejectAst(
      `Unsupported types in compare: [${valueTypeToString(
        firstType.type
      )}, ${valueTypeToString(secondType.type)}]`
    );
  }
  const compareOperators = /* @__PURE__ */ new Map([
    ["eqOp", "==="],
    ["neOp", "!=="]
  ]);
  if (!compareOperators.has(compareType)) {
    return rejectAst(compareType + " not yet implemented");
  }
  const operator = compareOperators.get(compareType);
  const [firstExpr, _firstBucket] = emitOperand(ast, "firstOperand", contextItemExpr2, context);
  const firstAsValue = emitConversionToValue(firstExpr, contextItemExpr2, context);
  const firstAtomized = emitAtomizedValue(firstAsValue, firstType, context);
  return mapPartialCompilationResult(
    context.getIdentifierFor(firstAtomized, "first"),
    (firstAtomized2) => {
      const [secondExpr, _secondBucket] = emitOperand(
        ast,
        "secondOperand",
        contextItemExpr2,
        context
      );
      const secondAsValue = emitConversionToValue(secondExpr, contextItemExpr2, context);
      const secondAtomized = emitAtomizedValue(secondAsValue, secondType, context);
      return mapPartialCompilationResult(
        context.getIdentifierFor(secondAtomized, "second"),
        (secondAtomized2) => {
          const nullChecks = [];
          if (doesTypeAllowEmpty(firstType)) {
            nullChecks.push(`${firstAtomized2.code} === null`);
          }
          if (doesTypeAllowEmpty(secondType)) {
            nullChecks.push(`${secondAtomized2.code} === null`);
          }
          return acceptAst(
            `(${nullChecks.length ? `${nullChecks.join(" || ")} ? null : ` : ""}${firstAtomized2.code} ${operator} ${secondAtomized2.code})`,
            { type: 0 /* Value */ },
            [...firstAtomized2.variables, ...secondAtomized2.variables]
          );
        }
      );
    }
  );
}
function emitSimplifiedGeneralCompare(ast, singleItemOperandName, multipleItemOperandName, compareType, contextItemExpr2, context) {
  const singleType2 = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, [singleItemOperandName, "*"]),
    "type"
  );
  const multipleType = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, [multipleItemOperandName, "*"]),
    "type"
  );
  if (!singleType2 || !multipleType) {
    return rejectAst("Can not generate code for general compare without both types");
  }
  const supportedTypes = [47 /* ATTRIBUTE */, 1 /* XSSTRING */];
  if (!supportedTypes.includes(singleType2.type) || !supportedTypes.includes(multipleType.type)) {
    return rejectAst(
      `Unsupported types in compare: [${valueTypeToString(
        singleType2.type
      )}, ${valueTypeToString(multipleType.type)}]`
    );
  }
  const compareOperators = /* @__PURE__ */ new Map([
    ["eqOp", "==="],
    ["neOp", "!=="]
  ]);
  if (!compareOperators.has(compareType)) {
    return rejectAst(compareType + " not yet implemented");
  }
  const operator = compareOperators.get(compareType);
  const [singleExpr, _singleBucket] = emitOperand(
    ast,
    singleItemOperandName,
    contextItemExpr2,
    context
  );
  const singleAsValue = emitConversionToValue(singleExpr, contextItemExpr2, context);
  const singleAtomized = emitAtomizedValue(singleAsValue, singleType2, context);
  return mapPartialCompilationResult(
    context.getIdentifierFor(singleAtomized, "single"),
    (singleAtomized2) => {
      const [multipleExpr, _multipleBucket] = emitOperand(
        ast,
        multipleItemOperandName,
        contextItemExpr2,
        context
      );
      return mapPartialCompilationResult(
        context.getIdentifierFor(multipleExpr, "multiple"),
        (multipleExpr2) => {
          if (multipleExpr2.generatedCodeType.type !== 1 /* Generator */) {
            return rejectAst(
              "can only generate general compare for a single value and a generator"
            );
          }
          const loopVar = context.getNewIdentifier("n");
          const atomizedLoopVar = emitAtomizedValue(loopVar, multipleType, context);
          return mapPartialCompilationResult(
            contextItemExpr2,
            (contextItemExpr3) => mapPartialCompilationResult(
              atomizedLoopVar,
              (atomizedLoopVar2) => acceptAst(
                `(function () {
									for (const ${loopVar.code} of ${multipleExpr2.code}(${contextItemExpr3.code})) {
										${atomizedLoopVar2.variables.join("\n")}
										if (${atomizedLoopVar2.code} ${operator} ${singleAtomized2.code}) {
											return true;
										}
									}
									return false;
								})()`,
                { type: 0 /* Value */ },
                [
                  ...singleAtomized2.variables,
                  ...loopVar.variables,
                  ...contextItemExpr3.variables,
                  ...multipleExpr2.variables
                ]
              )
            )
          );
        }
      );
    }
  );
}
function emitGeneralCompare(ast, compareType, contextItemExpr2, context) {
  const firstType = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, ["firstOperand", "*"]),
    "type"
  );
  const secondType = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, ["secondOperand", "*"]),
    "type"
  );
  if (!firstType || !secondType) {
    return rejectAst("types of compare are not known");
  }
  if (firstType.mult === 3 /* EXACTLY_ONE */ && secondType.mult === 3 /* EXACTLY_ONE */) {
    return emitValueCompare(ast, OPERATOR_TRANSLATION2[compareType], contextItemExpr2, context);
  }
  if (firstType.mult === 3 /* EXACTLY_ONE */) {
    return emitSimplifiedGeneralCompare(
      ast,
      "firstOperand",
      "secondOperand",
      OPERATOR_TRANSLATION2[compareType],
      contextItemExpr2,
      context
    );
  }
  if (secondType.mult === 3 /* EXACTLY_ONE */) {
    return emitSimplifiedGeneralCompare(
      ast,
      "secondOperand",
      "firstOperand",
      OPERATOR_SWAP_TABLE[OPERATOR_TRANSLATION2[compareType]],
      contextItemExpr2,
      context
    );
  }
  return rejectAst("General comparison for sequences is not implemented");
}
function emitCompareExpr(ast, compareType, contextItemExpr2, context) {
  switch (compareType) {
    // valueCompare
    case "eqOp":
    case "neOp":
    case "ltOp":
    case "leOp":
    case "gtOp":
    case "geOp":
    case "isOp":
      return emitValueCompare(ast, compareType, contextItemExpr2, context);
    // generalCompare
    case "equalOp":
    case "notEqualOp":
    case "lessThanOrEqualOp":
    case "lessThanOp":
    case "greaterThanOrEqualOp":
    case "greaterThanOp":
      return emitGeneralCompare(ast, compareType, contextItemExpr2, context);
    // nodeCompare
    case "nodeBeforeOp":
    case "nodeAfterOp":
    default:
      return rejectAst(`Unsupported compare type: ${compareType}`);
  }
}

// ../gh/fontoxpath/src/jsCodegen/escapeJavaScriptString.ts
function escapeJavaScriptString(untrustedString) {
  return JSON.stringify(untrustedString).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
var escapeJavaScriptString_default = escapeJavaScriptString;

// ../gh/fontoxpath/src/jsCodegen/emitFunctionCallExpr.ts
var supportedFunctions = {
  "false#0": emitFalseFunction,
  "local-name#0": emitLocalNameFunction,
  "local-name#1": emitLocalNameFunction,
  "name#0": emitNameFunction,
  "name#1": emitNameFunction,
  "not#1": emitNotFunction,
  "true#0": emitTrueFunction
};
var supportedBuiltinFunctions = {
  ["http://fontoxml.com/fontoxpath" /* FONTOXPATH_NAMESPACE_URI */]: ["version#0"],
  [""]: ["root#1", "path#1"]
};
function emitFunctionArgumentConversion(argAst, requestedType, contextItemExpr2, context) {
  const [argExpr, _2] = context.emitBaseExpr(argAst, contextItemExpr2, context);
  const actualType = astHelper_default.getAttribute(argAst, "type");
  if (doesTypeAllowMultiple(requestedType)) {
    return rejectAst("Not supported: sequence arguments with multiple items");
  }
  if (isSubtypeOf(requestedType.type, 53 /* NODE */)) {
    return emitConversionToFirstNode(argExpr, actualType, contextItemExpr2, context);
  }
  switch (requestedType.type) {
    case 59 /* ITEM */:
      return emitConversionToValue(argExpr, contextItemExpr2, context);
    case 0 /* XSBOOLEAN */:
      return emitEffectiveBooleanValue(argExpr, actualType, contextItemExpr2, context);
    case 1 /* XSSTRING */:
      return emitConversionToString(argExpr, actualType, contextItemExpr2, context);
  }
  return rejectAst(
    `Argument types not supported: ${actualType ? valueTypeToString(actualType.type) : "unknown"} -> ${valueTypeToString(requestedType.type)}`
  );
}
function emitFunctionArgumentsConversion(argAsts, argTypes, contextItemExpr2, context) {
  if (argAsts.length !== argTypes.length || argTypes.some((type2) => type2 === 4 /* ELLIPSIS */)) {
    return rejectAst("Not supported: variadic function or mismatch in argument count");
  }
  if (argAsts.length === 0) {
    return acceptAst("", { type: 0 /* Value */ }, []);
  }
  const [argAst, ...restArgAsts] = argAsts;
  const [type, ...restTypes] = argTypes;
  const argExpr = context.getIdentifierFor(
    emitFunctionArgumentConversion(
      argAst,
      // We checked for ELLIPSIS earlier, so all argument types are normal SequenceTypes
      type,
      contextItemExpr2,
      context
    ),
    "arg"
  );
  if (restArgAsts.length === 0) {
    return argExpr;
  }
  return mapPartialCompilationResult(argExpr, (argExpr2) => {
    const argsExpr = emitFunctionArgumentsConversion(
      restArgAsts,
      restTypes,
      contextItemExpr2,
      context
    );
    return mapPartialCompilationResult(
      argsExpr,
      (argsExpr2) => acceptAst(`${argExpr2.code}, ${argsExpr2.code}`, { type: 0 /* Value */ }, [
        ...argExpr2.variables,
        ...argsExpr2.variables
      ])
    );
  });
}
function emitFunctionReturnTypeConversion(callFunctionExpr, returnType) {
  return mapPartialCompilationResult(callFunctionExpr, (callFunctionExpr2) => {
    if (!doesTypeAllowMultiple(returnType) && ([0 /* XSBOOLEAN */, 1 /* XSSTRING */].includes(returnType.type) || isSubtypeOf(returnType.type, 53 /* NODE */))) {
      return callFunctionExpr2;
    }
    return rejectAst(
      `Function return type ${valueTypeToString(returnType.type)} not supported`
    );
  });
}
function emitFunctionCallExpr(ast, contextItemExpr2, context) {
  const { localName, namespaceURI } = astHelper_default.getQName(
    astHelper_default.getFirstChild(ast, "functionName")
  );
  const argAsts = astHelper_default.getChildren(astHelper_default.getFirstChild(ast, "arguments"), "*");
  const arity = argAsts.length;
  const functionNameAndArity = `${localName}#${arity}`;
  const isDefaultFunctionNamespace = namespaceURI === context.defaultFunctionNamespaceUri;
  if (isDefaultFunctionNamespace) {
    const emitFunctionCall = supportedFunctions[functionNameAndArity];
    if (emitFunctionCall !== void 0) {
      return emitFunctionCall(ast, contextItemExpr2, context);
    }
  }
  const allowlist = supportedBuiltinFunctions[isDefaultFunctionNamespace ? "" : namespaceURI];
  if (allowlist) {
    if (!allowlist.includes(functionNameAndArity)) {
      return rejectAst(
        `Not supported: built-in function not on allow list: ${functionNameAndArity}`
      );
    }
  }
  const functionProperties = getFunctionByArity(namespaceURI, localName, arity);
  if (!functionProperties) {
    return rejectAst(`Unknown function / arity: ${functionNameAndArity}`);
  }
  if (functionProperties.isUpdating) {
    return rejectAst("Not supported: updating functions");
  }
  const argsExpr = emitFunctionArgumentsConversion(
    argAsts,
    functionProperties.argumentTypes,
    contextItemExpr2,
    context
  );
  const callFunction2 = mapPartialCompilationResult(
    argsExpr,
    (argsExpr2) => acceptAst(
      `runtimeLib.callFunction(domFacade, ${escapeJavaScriptString_default(
        namespaceURI
      )}, ${escapeJavaScriptString_default(localName)}, [${argsExpr2.code}], options)`,
      { type: 0 /* Value */ },
      argsExpr2.variables
    )
  );
  return emitFunctionReturnTypeConversion(callFunction2, functionProperties.returnType);
}
function emitContextItemCheck(contextItemExpr2, context) {
  return mapPartialCompilationResult(
    context.getIdentifierFor(contextItemExpr2, "contextItem"),
    (contextItemExpr3) => acceptAst(contextItemExpr3.code, { type: 0 /* Value */ }, [
      ...contextItemExpr3.variables,
      `if (${contextItemExpr3.code} === undefined || ${contextItemExpr3.code} === null) {
					throw errXPDY0002('The function which was called depends on dynamic context, which is absent.');
				}`
    ])
  );
}
function emitSpecificNameFunction(ast, contextItemExpr2, context, nameGetterFunction) {
  const argumentAst = astHelper_default.followPath(ast, ["arguments", "*"]);
  let argExpr;
  if (!argumentAst || argumentAst[0] === "contextItemExpr") {
    argExpr = emitContextItemCheck(contextItemExpr2, context);
  } else {
    const argType = astHelper_default.getAttribute(argumentAst, "type");
    if (!argType || !isSubtypeOf(argType.type, 53 /* NODE */)) {
      return rejectAst("name function only implemented if arg is a node");
    }
    const [expr, _2] = context.emitBaseExpr(argumentAst, contextItemExpr2, context);
    argExpr = expr;
  }
  const argAsValue = emitConversionToValue(argExpr, contextItemExpr2, context);
  return mapPartialCompilationResult(
    context.getIdentifierFor(argAsValue, "arg"),
    (argAsValue2) => acceptAst(
      `(${argAsValue2.code} ? ${nameGetterFunction(argAsValue2.code)} : '')`,
      { type: 0 /* Value */ },
      argAsValue2.variables
    )
  );
}
function emitNameFunction(ast, contextItemExpr2, context) {
  return emitSpecificNameFunction(
    ast,
    contextItemExpr2,
    context,
    (identifier) => `(((${identifier}.prefix || '').length !== 0 ? ${identifier}.prefix + ':' : '')
		+ (${identifier}.localName || ${identifier}.target || ''))`
  );
}
function emitLocalNameFunction(ast, contextItemExpr2, context) {
  return emitSpecificNameFunction(
    ast,
    contextItemExpr2,
    context,
    (identifier) => `(${identifier}.localName || ${identifier}.target || '')`
  );
}
function emitNotFunction(ast, contextItemExpr2, context) {
  const argumentAst = astHelper_default.followPath(ast, ["arguments", "*"]);
  const argType = astHelper_default.getAttribute(argumentAst, "type");
  const [argExpr, _2] = context.emitBaseExpr(argumentAst, contextItemExpr2, context);
  const argAsBool = emitEffectiveBooleanValue(argExpr, argType, contextItemExpr2, context);
  return mapPartialCompilationResult(
    argAsBool,
    (argAsBool2) => acceptAst(`!${argAsBool2.code}`, { type: 0 /* Value */ }, argAsBool2.variables)
  );
}
function emitFalseFunction(_ast, _contextItemExpr, _context) {
  return acceptAst("false", { type: 0 /* Value */ }, []);
}
function emitTrueFunction(_ast, _contextItemExpr, _context) {
  return acceptAst("true", { type: 0 /* Value */ }, []);
}

// ../gh/fontoxpath/src/jsCodegen/emitLiterals.ts
function emitStringConstantExpr(ast) {
  let text = astHelper_default.getFirstChild(ast, "value")[1] || "";
  text = escapeJavaScriptString_default(text);
  return [acceptAst(text, { type: 0 /* Value */ }, []), null];
}

// ../gh/fontoxpath/src/jsCodegen/emitLogicalExpr.ts
function emitAndExpr(ast, contextItemExpr2, context) {
  return emitLogicalExpr(ast, "&&", contextItemExpr2, context);
}
function emitOrExpr(ast, contextItemExpr2, context) {
  return emitLogicalExpr(ast, "||", contextItemExpr2, context);
}
function emitLogicalExpr(ast, logicalExprOperator, contextItemExpr2, context) {
  const [firstExpr, firstBucket] = emitOperand(ast, "firstOperand", contextItemExpr2, context);
  const firstType = astHelper_default.getAttribute(
    astHelper_default.followPath(ast, ["firstOperand", "*"]),
    "type"
  );
  const firstAsBool = emitEffectiveBooleanValue(firstExpr, firstType, contextItemExpr2, context);
  const [secondExpr, secondBucket] = emitOperand(ast, "secondOperand", contextItemExpr2, context);
  const logicalOpExpr = mapPartialCompilationResult(firstAsBool, (firstAsBool2) => {
    const secondType = astHelper_default.getAttribute(
      astHelper_default.followPath(ast, ["secondOperand", "*"]),
      "type"
    );
    const secondAsBool = emitEffectiveBooleanValue(
      secondExpr,
      secondType,
      contextItemExpr2,
      context
    );
    return mapPartialCompilationResult(
      secondAsBool,
      (secondAsBool2) => acceptAst(
        `(${firstAsBool2.code} ${logicalExprOperator} ${secondAsBool2.code})`,
        { type: 0 /* Value */ },
        [...firstAsBool2.variables, ...secondAsBool2.variables]
      )
    );
  });
  const bucket = logicalExprOperator === "&&" ? intersectBuckets(firstBucket, secondBucket) : firstBucket === secondBucket ? firstBucket : null;
  return [logicalOpExpr, bucket];
}

// ../gh/fontoxpath/src/jsCodegen/emitAxis.ts
var axisAstNodes = {
  ATTRIBUTE: "attribute",
  CHILD: "child",
  PARENT: "parent",
  SELF: "self"
};
function emitMultipleNodesAxis(iterationCode, conditionExpr, nestedCode) {
  return mapPartialCompilationResult(
    iterationCode,
    (iterationCode2) => mapPartialCompilationResult(
      conditionExpr,
      (conditionExpr2) => mapPartialCompilationResult(
        nestedCode,
        (nestedCode2) => acceptAst(
          `for (${iterationCode2.code}) {
						${conditionExpr2.variables.join("\n")}
						if (!(${conditionExpr2.code})) {
							continue;
						}
						${nestedCode2.variables.join("\n")}
						${nestedCode2.code}
					}`,
          { type: 2 /* Statement */ },
          iterationCode2.variables
        )
      )
    )
  );
}
function emitChildAxis(conditionExpr, conditionBucket, nestedCode, stepContextItemExpr, contextItemExpr2) {
  const bucketArg = conditionBucket ? `, "${conditionBucket}"` : "";
  const iterationCode = mapPartialCompilationResult(
    stepContextItemExpr,
    (stepContextItemExpr2) => mapPartialCompilationResult(
      contextItemExpr2,
      (contextItemExpr3) => acceptAst(
        `let ${stepContextItemExpr2.code} = domFacade.getFirstChild(${contextItemExpr3.code}${bucketArg});
							${stepContextItemExpr2.code};
							${stepContextItemExpr2.code} = domFacade.getNextSibling(${stepContextItemExpr2.code}${bucketArg})`,
        { type: 2 /* Statement */ },
        [...stepContextItemExpr2.variables, ...contextItemExpr3.variables]
      )
    )
  );
  return emitMultipleNodesAxis(iterationCode, conditionExpr, nestedCode);
}
function emitAttributeAxis(conditionExpr, conditionBucket, nestedCode, stepContextItemExpr, contextItemExpr2) {
  const bucket = intersectBuckets(conditionBucket, "type-2");
  const nodesExpr = mapPartialCompilationResult(
    contextItemExpr2,
    (contextItemExpr3) => acceptAst(
      `(${contextItemExpr3.code} && ${contextItemExpr3.code}.nodeType === /*ELEMENT_NODE*/ ${1 /* ELEMENT_NODE */} ? domFacade.getAllAttributes(${contextItemExpr3.code}${bucket ? `, "${bucket}"` : ""}) : [])`,
      { type: 0 /* Value */ },
      contextItemExpr3.variables
    )
  );
  const iterationCode = mapPartialCompilationResult(
    stepContextItemExpr,
    (stepContextItemExpr2) => mapPartialCompilationResult(
      nodesExpr,
      (nodesExpr2) => acceptAst(
        `const ${stepContextItemExpr2.code} of ${nodesExpr2.code}`,
        { type: 2 /* Statement */ },
        [...stepContextItemExpr2.variables, ...nodesExpr2.variables]
      )
    )
  );
  return emitMultipleNodesAxis(iterationCode, conditionExpr, nestedCode);
}
function emitSelfAxis(conditionExpr, conditionBucket, nestedCode, stepContextItemExpr, contextItemExpr2) {
  return emitSingleNodeAxis(stepContextItemExpr, contextItemExpr2, conditionExpr, nestedCode);
}
function emitParentAxis(conditionExpr, conditionBucket, nestedCode, stepContextItemExpr, contextItemExpr2) {
  const bucketArg = conditionBucket ? `, "${conditionBucket}"` : "";
  const parentExpr = mapPartialCompilationResult(
    contextItemExpr2,
    (contextItemExpr3) => acceptAst(
      `domFacade.getParentNode(${contextItemExpr3.code}${bucketArg})`,
      { type: 0 /* Value */ },
      contextItemExpr3.variables
    )
  );
  return emitSingleNodeAxis(stepContextItemExpr, parentExpr, conditionExpr, nestedCode);
}
function emitSingleNodeAxis(stepContextItemExpr, contextItemExpr2, conditionExpr, nestedCode) {
  const nullCheck = stepContextItemExpr;
  const conditionsWithNullCheck = emitAnd(nullCheck, conditionExpr);
  return mapPartialCompilationResult(
    stepContextItemExpr,
    (stepContextItemExpr2) => mapPartialCompilationResult(
      contextItemExpr2,
      (contextItemExpr3) => mapPartialCompilationResult(
        conditionsWithNullCheck,
        (conditionsWithNullCheck2) => mapPartialCompilationResult(
          nestedCode,
          (nestedCode2) => acceptAst(
            `const ${stepContextItemExpr2.code} = ${contextItemExpr3.code};
						${conditionsWithNullCheck2.variables.join("\n")}
						if (${conditionsWithNullCheck2.code}) {
							${nestedCode2.variables.join("\n")}
							${nestedCode2.code}
						}`,
            { type: 2 /* Statement */ },
            [...stepContextItemExpr2.variables, ...contextItemExpr3.variables]
          )
        )
      )
    )
  );
}
function emitAxis(ast, conditionExpr, conditionBucket, nestedCode, stepContextItemExpr, contextItemExpr2) {
  const axisName = astHelper_default.getTextContent(ast);
  switch (axisName) {
    case axisAstNodes.ATTRIBUTE:
      return [
        emitAttributeAxis(
          conditionExpr,
          conditionBucket,
          nestedCode,
          stepContextItemExpr,
          contextItemExpr2
        ),
        "type-1"
      ];
    case axisAstNodes.CHILD:
      return [
        emitChildAxis(
          conditionExpr,
          conditionBucket,
          nestedCode,
          stepContextItemExpr,
          contextItemExpr2
        ),
        null
      ];
    case axisAstNodes.PARENT:
      return [
        emitParentAxis(
          conditionExpr,
          conditionBucket,
          nestedCode,
          stepContextItemExpr,
          contextItemExpr2
        ),
        null
      ];
    case axisAstNodes.SELF:
      return [
        emitSelfAxis(
          conditionExpr,
          conditionBucket,
          nestedCode,
          stepContextItemExpr,
          contextItemExpr2
        ),
        conditionBucket
      ];
    default:
      return [rejectAst(`Unsupported: the ${axisName} axis`), null];
  }
}

// ../gh/fontoxpath/src/jsCodegen/emitTest.ts
var testAstNodes = {
  TEXT_TEST: "textTest",
  ELEMENT_TEST: "elementTest",
  NAME_TEST: "nameTest",
  WILDCARD: "Wildcard",
  ANY_KIND_TEST: "anyKindTest"
};
var tests = Object.values(testAstNodes);
function emitTextTest(_ast, contextItemExpr2, _context) {
  return [
    mapPartialCompilationResult(
      contextItemExpr2,
      (contextItemExpr3) => acceptAst(
        `(${contextItemExpr3.code}.nodeType === /*TEXT_NODE*/ ${3 /* TEXT_NODE */} ||
				${contextItemExpr3.code}.nodeType === /* CDATA_SECTION_NODE */ ${4 /* CDATA_SECTION_NODE */})`,
        {
          type: 0 /* Value */
        },
        []
      )
    ),
    "type-3"
  ];
}
function resolveNamespaceURI(qName2, staticContext) {
  if (qName2.namespaceURI !== null) {
    return;
  }
  if (qName2.prefix === "*") {
    return;
  }
  const namespaceURI = staticContext.resolveNamespace(qName2.prefix || "") || null;
  if (!namespaceURI && qName2.prefix) {
    throw new Error(`XPST0081: The prefix ${qName2.prefix} could not be resolved.`);
  }
  qName2.namespaceURI = namespaceURI;
}
function emitNameTestFromQName(qName2, canBeAttribute, contextItemExpr2, context) {
  resolveNamespaceURI(qName2, context);
  const { prefix: prefix2, namespaceURI, localName } = qName2;
  return mapPartialCompilationResultAndBucket(contextItemExpr2, (contextItemExpr3) => {
    const isCorrectNodeTypeExpr = canBeAttribute ? acceptAst(
      `${contextItemExpr3.code}.nodeType
						&& (${contextItemExpr3.code}.nodeType === /*ELEMENT_NODE*/ ${1 /* ELEMENT_NODE */}
						|| ${contextItemExpr3.code}.nodeType === /*ATTRIBUTE_NODE*/ ${2 /* ATTRIBUTE_NODE */})`,
      { type: 0 /* Value */ },
      []
    ) : acceptAst(
      `${contextItemExpr3.code}.nodeType
						&& ${contextItemExpr3.code}.nodeType === /*ELEMENT_NODE*/ ${1 /* ELEMENT_NODE */}`,
      { type: 0 /* Value */ },
      []
    );
    if (prefix2 === "*") {
      if (localName === "*") {
        return [isCorrectNodeTypeExpr, canBeAttribute ? "type-1-or-type-2" : "type-1"];
      }
      return [
        emitAnd(
          isCorrectNodeTypeExpr,
          acceptAst(
            `${contextItemExpr3.code}.localName === ${escapeJavaScriptString_default(
              localName
            )}`,
            { type: 0 /* Value */ },
            []
          )
        ),
        `name-${localName}`
      ];
    }
    const matchesLocalNameExpr = localName === "*" ? isCorrectNodeTypeExpr : emitAnd(
      isCorrectNodeTypeExpr,
      acceptAst(
        `${contextItemExpr3.code}.localName === ${escapeJavaScriptString_default(
          localName
        )}`,
        { type: 0 /* Value */ },
        []
      )
    );
    const namespaceUriExpr = acceptAst(
      escapeJavaScriptString_default(namespaceURI),
      { type: 0 /* Value */ },
      []
    );
    const nodeNamespaceExpr = prefix2 === "" && canBeAttribute ? (
      // The prefix was empty: attributes should always resolve the empty prefix to the null namespace
      mapPartialCompilationResult(
        namespaceUriExpr,
        (namespaceUriExpr2) => acceptAst(
          `${contextItemExpr3.code}.nodeType === /*ELEMENT_NODE*/ ${1 /* ELEMENT_NODE */} ? ${namespaceUriExpr2.code} : null`,
          { type: 0 /* Value */ },
          namespaceUriExpr2.variables
        )
      )
    ) : namespaceUriExpr;
    const matchesNamespaceExpr = mapPartialCompilationResult(
      nodeNamespaceExpr,
      (nodeNamespaceExpr2) => acceptAst(
        `(${contextItemExpr3.code}.namespaceURI || null) === ((${nodeNamespaceExpr2.code}) || null)`,
        { type: 0 /* Value */ },
        nodeNamespaceExpr2.variables
      )
    );
    return [emitAnd(matchesLocalNameExpr, matchesNamespaceExpr), `name-${localName}`];
  });
}
function emitElementTest(ast, contextItemExpr2, context) {
  const elementName2 = astHelper_default.getFirstChild(ast, "elementName");
  const star = elementName2 && astHelper_default.getFirstChild(elementName2, "star");
  if (elementName2 === null || star) {
    return [
      mapPartialCompilationResult(
        contextItemExpr2,
        (contextItemExpr3) => acceptAst(
          `${contextItemExpr3.code}.nodeType === /*ELEMENT_NODE*/ ${1 /* ELEMENT_NODE */}`,
          { type: 0 /* Value */ },
          []
        )
      ),
      "type-1"
    ];
  }
  const qName2 = astHelper_default.getQName(astHelper_default.getFirstChild(elementName2, "QName"));
  return emitNameTestFromQName(qName2, false, contextItemExpr2, context);
}
function emitNameTest(ast, canBeAttribute, contextItemExpr2, context) {
  return emitNameTestFromQName(astHelper_default.getQName(ast), canBeAttribute, contextItemExpr2, context);
}
function emitWildcard(ast, canBeAttribute, contextItemExpr2, context) {
  if (!astHelper_default.getFirstChild(ast, "star")) {
    return emitNameTestFromQName(
      {
        localName: "*",
        namespaceURI: null,
        prefix: "*"
      },
      canBeAttribute,
      contextItemExpr2,
      context
    );
  }
  const uri = astHelper_default.getFirstChild(ast, "uri");
  if (uri !== null) {
    return emitNameTestFromQName(
      {
        localName: "*",
        namespaceURI: astHelper_default.getTextContent(uri),
        prefix: ""
      },
      canBeAttribute,
      contextItemExpr2,
      context
    );
  }
  const ncName2 = astHelper_default.getFirstChild(ast, "NCName");
  if (astHelper_default.getFirstChild(ast, "*")[0] === "star") {
    return emitNameTestFromQName(
      {
        localName: astHelper_default.getTextContent(ncName2),
        namespaceURI: null,
        prefix: "*"
      },
      canBeAttribute,
      contextItemExpr2,
      context
    );
  }
  return emitNameTestFromQName(
    {
      localName: "*",
      namespaceURI: null,
      prefix: astHelper_default.getTextContent(ncName2)
    },
    canBeAttribute,
    contextItemExpr2,
    context
  );
}
function emitAnyKindTest(_ast, contextItemExpr2, _context) {
  return [
    mapPartialCompilationResult(
      contextItemExpr2,
      (contextItemExpr3) => acceptAst(
        `!!${contextItemExpr3.code}.nodeType`,
        {
          type: 0 /* Value */
        },
        []
      )
    ),
    null
  ];
}
function emitTest(ast, canBeAttribute, contextItemExpr2, context) {
  const test = ast[0];
  switch (test) {
    case testAstNodes.ELEMENT_TEST:
      return emitElementTest(ast, contextItemExpr2, context);
    case testAstNodes.TEXT_TEST:
      return emitTextTest(ast, contextItemExpr2, context);
    case testAstNodes.NAME_TEST:
      return emitNameTest(ast, canBeAttribute, contextItemExpr2, context);
    case testAstNodes.WILDCARD:
      return emitWildcard(ast, canBeAttribute, contextItemExpr2, context);
    case testAstNodes.ANY_KIND_TEST:
      return emitAnyKindTest(ast, contextItemExpr2, context);
    default:
      return [rejectAst(`Test not implemented: '${test}`), null];
  }
}

// ../gh/fontoxpath/src/jsCodegen/emitPathExpr.ts
function emitPredicate(predicateAst, contextItemExpr2, context) {
  const [expr, bucket] = context.emitBaseExpr(predicateAst, contextItemExpr2, context);
  const type = astHelper_default.getAttribute(predicateAst, "type");
  const asBool = emitEffectiveBooleanValue(expr, type, contextItemExpr2, context);
  return [asBool, bucket];
}
function emitPredicates(predicatesAst, contextItemExpr2, context) {
  const predicateAsts = predicatesAst ? astHelper_default.getChildren(predicatesAst, "*") : [];
  const [combinedPredicatesExpr, bucket] = predicateAsts.reduce(
    ([previousExpr, previousBucket], predicateAst) => {
      if (!previousExpr) {
        return emitPredicate(predicateAst, contextItemExpr2, context);
      }
      let combinedBucket = previousBucket;
      return mapPartialCompilationResultAndBucket(previousExpr, (previousExpr2) => {
        const [predicateExpr, bucket2] = emitPredicate(
          predicateAst,
          contextItemExpr2,
          context
        );
        combinedBucket = intersectBuckets(previousBucket, bucket2);
        return [
          mapPartialCompilationResult(
            predicateExpr,
            (predicateExpr2) => acceptAst(
              `${previousExpr2.code} && ${predicateExpr2.code}`,
              { type: 0 /* Value */ },
              [...previousExpr2.variables, ...predicateExpr2.variables]
            )
          ),
          combinedBucket
        ];
      });
    },
    [null, null]
  );
  return [
    // Make predicate variables evaluate lazily so the test is always checked first
    combinedPredicatesExpr ? mapPartialCompilationResult(
      combinedPredicatesExpr,
      (combinedPredicatesExpr2) => acceptAst(
        `(function () {
							${combinedPredicatesExpr2.variables.join("\n")}
							return ${combinedPredicatesExpr2.code};
						})()`,
        { type: 0 /* Value */ },
        []
      )
    ) : null,
    bucket
  ];
}
function emitSteps(stepAsts, contextItemCanBeAttribute, contextItemExpr2, context) {
  if (stepAsts.length === 0) {
    return [
      mapPartialCompilationResult(
        contextItemExpr2,
        (contextItemExpr3) => acceptAst(
          `yield ${contextItemExpr3.code};`,
          { type: 2 /* Statement */ },
          contextItemExpr3.variables
        )
      ),
      null
    ];
  }
  const [stepAst, ...restStepAsts] = stepAsts;
  const lookupAsts = astHelper_default.getChildren(stepAst, "lookup");
  if (lookupAsts.length > 0) {
    return [rejectAst("Unsupported: lookups"), null];
  }
  const stepContextItemExpr = context.getNewIdentifier("contextItem");
  const predicatesAst = astHelper_default.getFirstChild(stepAst, "predicates");
  const [predicatesExpr, predicatesBucket] = emitPredicates(
    predicatesAst,
    stepContextItemExpr,
    context
  );
  const axisAst = astHelper_default.getFirstChild(stepAst, "xpathAxis");
  if (axisAst) {
    const testAst = astHelper_default.getFirstChild(stepAst, tests);
    if (!testAst) {
      return [rejectAst("Unsupported test in step"), null];
    }
    const axisType = astHelper_default.getTextContent(axisAst);
    const stepContextItemCanBeAttribute = axisType === "attribute" || axisType === "self" && contextItemCanBeAttribute;
    const [testExpr, testBucket] = emitTest(
      testAst,
      stepContextItemCanBeAttribute,
      stepContextItemExpr,
      context
    );
    const combinedConditionExpr = predicatesExpr === null ? testExpr : emitAnd(testExpr, predicatesExpr);
    const combinedConditionBucket = intersectBuckets(testBucket, predicatesBucket);
    const [nestedStepsCode, _2] = emitSteps(
      restStepAsts,
      stepContextItemCanBeAttribute,
      stepContextItemExpr,
      context
    );
    return emitAxis(
      axisAst,
      combinedConditionExpr,
      combinedConditionBucket,
      nestedStepsCode,
      stepContextItemExpr,
      contextItemExpr2
    );
  }
  const filterExprAst = astHelper_default.followPath(stepAst, ["filterExpr", "*"]);
  if (!filterExprAst) {
    return [rejectAst("Unsupported: unknown step type"), null];
  }
  const [filterExpr, filterBucket] = context.emitBaseExpr(
    filterExprAst,
    contextItemExpr2,
    context
  );
  return [
    mapPartialCompilationResult(filterExpr, (filterExpr2) => {
      const pathTypeCheck = restStepAsts.length === 0 ? acceptAst(``, { type: 2 /* Statement */ }, []) : acceptAst(
        `if (${stepContextItemExpr.code} !== null && !${stepContextItemExpr.code}.nodeType) {
									throw new Error('XPTY0019: The result of E1 in a path expression E1/E2 should evaluate to a sequence of nodes.');
								}`,
        { type: 2 /* Statement */ },
        []
      );
      const [nestedStepsCode, _2] = emitSteps(
        restStepAsts,
        true,
        stepContextItemExpr,
        context
      );
      const nestedCode = predicatesExpr === null ? nestedStepsCode : mapPartialCompilationResult(
        predicatesExpr,
        (predicatesExpr2) => mapPartialCompilationResult(
          nestedStepsCode,
          (nestedStepsCode2) => acceptAst(
            `if (${predicatesExpr2.code}) {
									${nestedStepsCode2.variables.join("\n")}
									${nestedStepsCode2.code}
								}`,
            { type: 2 /* Statement */ },
            predicatesExpr2.variables
          )
        )
      );
      return mapPartialCompilationResult(nestedCode, (nestedCode2) => {
        switch (filterExpr2.generatedCodeType.type) {
          case 1 /* Generator */:
            return mapPartialCompilationResult(
              contextItemExpr2,
              (contextItemExpr3) => acceptAst(
                `for (const ${stepContextItemExpr.code} of ${filterExpr2.code}(${contextItemExpr3.code})) {
									${nestedCode2.variables.join("\n")}
									${nestedCode2.code}
								}`,
                { type: 2 /* Statement */ },
                [
                  ...stepContextItemExpr.variables,
                  ...filterExpr2.variables,
                  ...pathTypeCheck.variables
                ]
              )
            );
          case 0 /* Value */:
            return acceptAst(
              `const ${stepContextItemExpr.code} = ${filterExpr2.code};
							${pathTypeCheck.code}
							if (${stepContextItemExpr.code} !== null) {
								${nestedCode2.variables.join("\n")}
								${nestedCode2.code}
							}`,
              { type: 2 /* Statement */ },
              [
                ...stepContextItemExpr.variables,
                ...filterExpr2.variables,
                ...pathTypeCheck.variables
              ]
            );
          default:
            return rejectAst("Unsupported generated code type for filterExpr");
        }
      });
    }),
    filterBucket
  ];
}
function emitRootExpr(contextItemExpr2, _context) {
  return mapPartialCompilationResult(
    contextItemExpr2,
    (contextItemExpr3) => acceptAst(
      `(function () {
				let n = ${contextItemExpr3.code};
				while (n.nodeType !== /*DOCUMENT_NODE*/${9 /* DOCUMENT_NODE */}) {
					n = domFacade.getParentNode(n);
					if (n === null) {
						throw new Error('XPDY0050: the root node of the context node is not a document node.');
					}
				}
				return n;
			})()`,
      { type: 0 /* Value */ },
      contextItemExpr3.variables
    )
  );
}
function emitSingleSelfPathExpr(stepAst, contextItemExpr2, context) {
  return mapPartialCompilationResultAndBucket(contextItemExpr2, (contextItemExpr3) => {
    const lookupAsts = astHelper_default.getChildren(stepAst, "lookup");
    if (lookupAsts.length > 0) {
      return [rejectAst("Unsupported: lookups"), null];
    }
    const predicatesAst = astHelper_default.getFirstChild(stepAst, "predicates");
    const [predicatesExpr, predicatesBucket] = emitPredicates(
      predicatesAst,
      contextItemExpr3,
      context
    );
    const testAst = astHelper_default.getFirstChild(stepAst, tests);
    if (!testAst) {
      return [rejectAst("Unsupported test in step"), null];
    }
    const [testExpr, testBucket] = emitTest(testAst, true, contextItemExpr3, context);
    const combinedConditionExpr = predicatesExpr === null ? testExpr : emitAnd(testExpr, predicatesExpr);
    const combinedConditionBucket = intersectBuckets(testBucket, predicatesBucket);
    return [
      mapPartialCompilationResult(
        combinedConditionExpr,
        (combinedConditionExpr2) => acceptAst(
          `((${combinedConditionExpr2.code}) ? ${contextItemExpr3.code} : null)`,
          { type: 0 /* Value */ },
          [...contextItemExpr3.variables, ...combinedConditionExpr2.variables]
        )
      ),
      combinedConditionBucket
    ];
  });
}
function emitPathExpr(ast, contextItemExpr2, context) {
  const stepAsts = astHelper_default.getChildren(ast, "stepExpr");
  if (stepAsts.length === 1) {
    const axisAst = astHelper_default.getFirstChild(stepAsts[0], "xpathAxis");
    if (axisAst && astHelper_default.getTextContent(axisAst) === axisAstNodes.SELF) {
      return emitSingleSelfPathExpr(stepAsts[0], contextItemExpr2, context);
    }
  }
  const contextItemArgExpr = context.getNewIdentifier("contextItem");
  const isAbsolute = astHelper_default.getFirstChild(ast, "rootExpr");
  const rootExpr = isAbsolute ? context.getIdentifierFor(emitRootExpr(contextItemArgExpr, context), "root") : contextItemArgExpr;
  const [stepsCode, bucket] = emitSteps(stepAsts, !isAbsolute, rootExpr, context);
  const generatorExpr = mapPartialCompilationResult(
    stepsCode,
    (stepsCode2) => acceptAst(
      `(function* (${contextItemArgExpr.code}) {
			${stepsCode2.variables.join("\n")}
			${stepsCode2.code}
		})`,
      { type: 1 /* Generator */ },
      []
    )
  );
  return [generatorExpr, bucket];
}

// ../gh/fontoxpath/src/jsCodegen/emitBaseExpr.ts
function emitBaseExpr(ast, contextItemExpr2, context) {
  const name2 = ast[0];
  switch (name2) {
    case "contextItemExpr":
      return [contextItemExpr2, null];
    case "pathExpr":
      return emitPathExpr(ast, contextItemExpr2, context);
    case "andOp":
      return emitAndExpr(ast, contextItemExpr2, context);
    case "orOp":
      return emitOrExpr(ast, contextItemExpr2, context);
    case "stringConstantExpr":
      return emitStringConstantExpr(ast);
    // generalCompare
    case "equalOp":
    case "notEqualOp":
    case "lessThanOrEqualOp":
    case "lessThanOp":
    case "greaterThanOrEqualOp":
    case "greaterThanOp":
    // valueCompare
    case "eqOp":
    case "neOp":
    case "ltOp":
    case "leOp":
    case "gtOp":
    case "geOp":
    case "isOp":
    // nodeCompare
    case "nodeBeforeOp":
    case "nodeAfterOp":
      return [emitCompareExpr(ast, name2, contextItemExpr2, context), null];
    case "functionCallExpr":
      return [emitFunctionCallExpr(ast, contextItemExpr2, context), null];
    default:
      return [rejectAst(`Unsupported: the base expression '${name2}'.`), null];
  }
}

// ../gh/fontoxpath/src/jsCodegen/CodeGenContext.ts
var CodeGenContext = class {
  constructor(resolveNamespace, defaultFunctionNamespaceUri) {
    this._identifierExprByExpr = /* @__PURE__ */ new Map();
    this._nextByPrefix = /* @__PURE__ */ new Map();
    this.resolveNamespace = resolveNamespace;
    this.defaultFunctionNamespaceUri = defaultFunctionNamespaceUri;
    this.emitBaseExpr = emitBaseExpr;
  }
  getIdentifierFor(expr, prefix2) {
    return mapPartialCompilationResult(expr, (expr2) => {
      let identifierExpr = this._identifierExprByExpr.get(expr2);
      if (!identifierExpr) {
        const identifier = this._getNewIdentifier(prefix2);
        identifierExpr = acceptAst(identifier, expr2.generatedCodeType, [
          ...expr2.variables,
          `const ${identifier} = ${expr2.code};`
        ]);
        this._identifierExprByExpr.set(expr2, identifierExpr);
        this._identifierExprByExpr.set(identifierExpr, identifierExpr);
      }
      return identifierExpr;
    });
  }
  getNewIdentifier(prefix2) {
    return this.getVarInScope(this._getNewIdentifier(prefix2));
  }
  getVarInScope(identifier) {
    const expr = acceptAst(identifier, { type: 0 /* Value */ }, []);
    this._identifierExprByExpr.set(expr, expr);
    return expr;
  }
  _getNewIdentifier(prefix2 = "v") {
    const next = this._nextByPrefix.get(prefix2) || 0;
    this._nextByPrefix.set(prefix2, next + 1);
    return `${prefix2}${next}`;
  }
};

// ../gh/fontoxpath/src/jsCodegen/compileAstToJavaScript.ts
function emitReturnTypeConversion(expr, returnType, astType, contextItemExpr2, context) {
  switch (returnType) {
    case 9 /* FIRST_NODE */:
      return emitConversionToFirstNode(expr, astType, contextItemExpr2, context);
    case 7 /* NODES */:
      return emitConversionToNodes(expr, astType, contextItemExpr2, context);
    case 3 /* BOOLEAN */:
      return emitEffectiveBooleanValue(expr, astType, contextItemExpr2, context);
    case 2 /* STRING */:
      return emitConversionToString(expr, astType, contextItemExpr2, context);
    default:
      return rejectAst(`Unsupported: the return type '${returnType}'.`);
  }
}
function wrapCompiledCode(code, shouldUseContextItem) {
  let finalCode = `
	return (contextItem, domFacade, runtimeLib, options) => {
		const {
			errXPDY0002,
		} = runtimeLib;`;
  if (shouldUseContextItem) {
    finalCode += `
		if (!contextItem) {
			throw errXPDY0002("Context is needed to evaluate the given path expression.");
		}

		if (!contextItem.nodeType) {
			throw new Error("Context item must be subtype of node().");
		}
		`;
  }
  finalCode += code + `}`;
  finalCode += "\n//# sourceURL=generated.js";
  return finalCode;
}
function compileAstToJavaScript(xPathAst, returnType, context) {
  const mainModule = astHelper_default.getFirstChild(xPathAst, "mainModule");
  if (!mainModule) {
    return rejectAst(`Unsupported: Can not execute a library module.`);
  }
  const prolog = astHelper_default.getFirstChild(mainModule, "prolog");
  if (prolog) {
    return rejectAst(`Unsupported: XQuery.`);
  }
  const queryBodyContents = astHelper_default.followPath(mainModule, ["queryBody", "*"]);
  const contextItemExpr2 = context.getVarInScope("contextItem");
  const [compiledBaseExpr, _bucket] = context.emitBaseExpr(
    queryBodyContents,
    contextItemExpr2,
    context
  );
  const queryType = astHelper_default.getAttribute(queryBodyContents, "type");
  const compiledReturnValue = emitReturnTypeConversion(
    compiledBaseExpr,
    returnType,
    queryType,
    contextItemExpr2,
    context
  );
  if (!compiledReturnValue.isAstAccepted) {
    return compiledReturnValue;
  }
  const code = `
		${compiledReturnValue.variables.join("\n")}
		return ${compiledReturnValue.code};`;
  const requiresContext = checkForContextItemInExpression(xPathAst);
  const wrappedCode = wrapCompiledCode(code, requiresContext);
  return acceptFullyCompiledAst(wrappedCode);
}
function checkForContextItemInExpression(ast) {
  const children = astHelper_default.getChildren(ast, "*");
  if (ast[0] === "pathExpr") {
    return true;
  }
  for (const child of children) {
    if (checkForContextItemInExpression(child)) {
      return true;
    }
  }
  return false;
}
var compileAstToJavaScript_default = compileAstToJavaScript;

// ../gh/fontoxpath/src/jsCodegen/compileXPathToJavaScript.ts
function compileXPathToJavaScript(selector, returnType, options) {
  options = options || {};
  returnType = returnType || 0 /* ANY */;
  let ast;
  if (typeof selector === "string") {
    const expressionString = normalizeEndOfLines(selector);
    const parserOptions = {
      allowXQuery: options["language"] === "XQuery3.1" /* XQUERY_3_1_LANGUAGE */ || options["language"] === "XQueryUpdate3.1" /* XQUERY_UPDATE_3_1_LANGUAGE */,
      // Debugging inserts xs:stackTrace in the AST, but this is not supported
      // yet by the js-codegen backend.
      debug: false,
      version: options["language"] === "XPath4.0" /* XPATH_4_0_LANGUAGE */ || options["language"] === "XQuery4.0" /* XQUERY_4_0_LANGUAGE */ || options["language"] === "XQueryUpdate4.0" /* XQUERY_UPDATE_4_0_LANGUAGE */ ? 4 : 3.1
    };
    try {
      ast = parseExpression(expressionString, parserOptions);
    } catch (error) {
      printAndRethrowError(expressionString, error);
    }
  } else {
    ast = convertXmlToAst(selector);
  }
  const mainModule = astHelper_default.getFirstChild(ast, "mainModule");
  if (!mainModule) {
    return rejectAst(`Unsupported: XQuery Library modules are not supported.`);
  }
  const prolog = astHelper_default.getFirstChild(mainModule, "prolog");
  if (prolog) {
    return rejectAst(`Unsupported: XQuery Prologs are not supported.`);
  }
  const defaultFunctionNamespaceUri = options["defaultFunctionNamespaceURI"] === void 0 ? "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */ : options["defaultFunctionNamespaceURI"];
  const codegenContext = new CodeGenContext(
    options["namespaceResolver"] || createDefaultNamespaceResolver(null),
    defaultFunctionNamespaceUri
  );
  annotateAst(
    ast,
    new AnnotationContext(
      new StaticContext(
        new ExecutionSpecificStaticContext(
          codegenContext.resolveNamespace,
          {},
          defaultFunctionNamespaceUri,
          options["functionNameResolver"] || createDefaultFunctionNameResolver(
            "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */
          )
        )
      )
    )
  );
  return compileAstToJavaScript_default(ast, returnType, codegenContext);
}
var compileXPathToJavaScript_default = compileXPathToJavaScript;

// ../gh/fontoxpath/src/registerCustomXPathFunction.ts
var CustomXPathFunctionError = class extends Error {
  constructor(innerError, localName, namespaceURI) {
    let stack = innerError.stack;
    if (stack) {
      if (stack.includes(innerError.message)) {
        stack = stack.substr(stack.indexOf(innerError.message) + innerError.message.length).trim();
      }
      let stackLines = stack.split("\n");
      stackLines.splice(10);
      stackLines = stackLines.map((line) => {
        if (line.startsWith("    ") || line.startsWith("	")) {
          return line;
        }
        return `    ${line}`;
      });
      stack = stackLines.join("\n");
    }
    const message = `Custom XPath function Q{${namespaceURI}}${localName} raised:
${innerError.message}
${stack}`;
    super(message);
  }
};
function adaptXPathValueToJavascriptValue(valueSequence, sequenceType, executionParameters) {
  if (sequenceType.mult === 0 /* ZERO_OR_ONE */) {
    if (valueSequence.isEmpty()) {
      return null;
    }
    return transformXPathItemToJavascriptObject(
      valueSequence.first(),
      executionParameters
    ).next(0 /* NONE */).value;
  }
  if (sequenceType.mult === 2 /* ZERO_OR_MORE */ || sequenceType.mult === 1 /* ONE_OR_MORE */) {
    return valueSequence.getAllValues().map((value) => {
      if (isSubtypeOf(value.type, 47 /* ATTRIBUTE */)) {
        throw new Error("Cannot pass attribute nodes to custom functions");
      }
      return transformXPathItemToJavascriptObject(value, executionParameters).next(
        0 /* NONE */
      ).value;
    });
  }
  return transformXPathItemToJavascriptObject(valueSequence.first(), executionParameters).next(
    0 /* NONE */
  ).value;
}
function splitFunctionName(name2) {
  if (typeof name2 === "object") {
    return name2;
  }
  const parts = name2.split(":");
  if (parts.length !== 2) {
    throw new Error("Do not register custom functions in the default function namespace");
  }
  const [prefix2, localName] = parts;
  let namespaceURIForPrefix = staticallyKnownNamespaceByPrefix[prefix2];
  if (!namespaceURIForPrefix) {
    namespaceURIForPrefix = `generated_namespace_uri_${prefix2}`;
    registerStaticallyKnownNamespace(prefix2, namespaceURIForPrefix);
  }
  return {
    localName,
    namespaceURI: namespaceURIForPrefix
  };
}
function registerCustomXPathFunction(name2, signatureNames, returnTypeName, callback) {
  const { namespaceURI, localName } = splitFunctionName(name2);
  if (!namespaceURI) {
    throw errXQST0060();
  }
  const signature = signatureNames.map((x2) => stringToSequenceType(x2));
  const returnType = stringToSequenceType(returnTypeName);
  const callFunction2 = function(_dynamicContext, executionParameters, _staticContext) {
    const args = Array.from(arguments);
    args.splice(0, 3);
    const newArguments = args.map((argument, index) => {
      return adaptXPathValueToJavascriptValue(
        argument,
        signature[index],
        executionParameters
      );
    });
    const dynamicContextAdapter = {
      ["currentContext"]: executionParameters.currentContext,
      ["domFacade"]: executionParameters.domFacade.unwrap()
    };
    let jsResult;
    try {
      jsResult = callback.apply(void 0, [dynamicContextAdapter, ...newArguments]);
    } catch (error) {
      throw new CustomXPathFunctionError(error, localName, namespaceURI);
    }
    if (jsResult && typeof jsResult === "object" && Object.getOwnPropertySymbols(jsResult).includes(IS_XPATH_VALUE_SYMBOL)) {
      const castedObject = jsResult;
      return sequenceFactory_default.create(castedObject.convertedValue);
    }
    const xpathResult = adaptJavaScriptValueToSequence(
      executionParameters.domFacade,
      jsResult,
      returnType
    );
    return xpathResult;
  };
  registerFunction(namespaceURI, localName, signature, returnType, callFunction2);
}

// ../gh/fontoxpath/src/jsCodegen/runtimeLib.ts
var runtimeLib = {
  callFunction(domFacade2, namespaceURI, localName, args, options) {
    const functionProperties = getFunctionByArity(namespaceURI, localName, args.length);
    if (!functionProperties) {
      throw new Error("function not found for codegen function call");
    }
    const dynamicContext = new DynamicContext_default({
      contextItem: null,
      contextItemIndex: 0,
      contextSequence: sequenceFactory_default.empty(),
      variableBindings: {}
    });
    const wrappedDomFacade = new DomFacade_default(domFacade2);
    const currentContext = options ? options["currentContext"] : null;
    const executionParameters = new ExecutionParameters(
      false,
      false,
      wrappedDomFacade,
      null,
      null,
      currentContext,
      null
    );
    const ret = functionProperties.callFunction(
      dynamicContext,
      executionParameters,
      null,
      ...args.map(
        (v3, i4) => adaptJavaScriptValueToSequence(
          wrappedDomFacade,
          v3,
          functionProperties.argumentTypes[i4]
        )
      )
    );
    return adaptXPathValueToJavascriptValue(
      ret,
      {
        type: 59 /* ITEM */,
        mult: 0 /* ZERO_OR_ONE */
      },
      executionParameters
    );
  },
  errXPDY0002
};
var runtimeLib_default = runtimeLib;

// ../gh/fontoxpath/src/jsCodegen/executeJavaScriptCompiledXPath.ts
var executeJavaScriptCompiledXPath = (compiledXPathFunction, contextItem, domFacade2, options) => {
  domFacade2 = !domFacade2 ? new ExternalDomFacade() : domFacade2;
  return compiledXPathFunction()(contextItem ?? null, domFacade2, runtimeLib_default, options);
};
var executeJavaScriptCompiledXPath_default = executeJavaScriptCompiledXPath;

// ../gh/fontoxpath/src/parseScript.ts
var PREFERRED_PREFIX_BY_NAMESPACEURI = {
  ["http://www.w3.org/2005/XQueryX" /* XQUERYX_NAMESPACE_URI */]: "xqx",
  ["http://www.w3.org/2007/xquery-update-10" /* XQUERYX_UPDATING_NAMESPACE_URI */]: "xquf",
  ["http://fontoxml.com/fontoxpath" /* FONTOXPATH_NAMESPACE_URI */]: "x"
};
function getQName3(name2, parentUri) {
  switch (name2) {
    case "copySource":
    case "insertAfter":
    case "insertAsFirst":
    case "insertAsLast":
    case "insertBefore":
    case "insertInto":
    case "modifyExpr":
    case "newNameExpr":
    case "replacementExpr":
    case "replaceValue":
    case "returnExpr":
    case "sourceExpr":
    case "targetExpr":
    case "transformCopies":
    case "transformCopy":
      return {
        localName: name2,
        namespaceUri: parentUri || "http://www.w3.org/2005/XQueryX" /* XQUERYX_NAMESPACE_URI */
      };
    case "deleteExpr":
    case "insertExpr":
    case "renameExpr":
    case "replaceExpr":
    case "transformExpr":
      return {
        localName: name2,
        namespaceUri: "http://www.w3.org/2007/xquery-update-10" /* XQUERYX_UPDATING_NAMESPACE_URI */
      };
    case "x:stackTrace":
      return {
        localName: "stackTrace",
        namespaceUri: "http://fontoxml.com/fontoxpath" /* FONTOXPATH_NAMESPACE_URI */
      };
    default:
      return {
        localName: name2,
        namespaceUri: "http://www.w3.org/2005/XQueryX" /* XQUERYX_NAMESPACE_URI */
      };
  }
}
function parseNode(documentWriter, simpleNodesFactory, jsonml, parentUri, skipEmptyPrefixes) {
  if (typeof jsonml === "string") {
    if (jsonml.length === 0) {
      return null;
    }
    return simpleNodesFactory.createTextNode(jsonml);
  }
  if (!Array.isArray(jsonml)) {
    throw new TypeError("JsonML element should be an array or string");
  }
  const qName2 = getQName3(jsonml[0], parentUri);
  const name2 = qName2.localName;
  const namespaceUri = qName2.namespaceUri;
  const element = simpleNodesFactory.createElementNS(
    namespaceUri,
    PREFERRED_PREFIX_BY_NAMESPACEURI[namespaceUri] + ":" + name2
  );
  const firstChild = jsonml[1];
  let firstChildIndex = 1;
  if (typeof firstChild === "object" && !Array.isArray(firstChild)) {
    if (firstChild !== null) {
      for (const attributeName of Object.keys(firstChild)) {
        let attributeValue = firstChild[attributeName];
        if (attributeValue === null) {
          continue;
        }
        if (attributeName === "type") {
          if (attributeValue !== void 0) {
            documentWriter.setAttributeNS(
              element,
              namespaceUri,
              "fontoxpath:" + attributeName,
              sequenceTypeToString(attributeValue)
            );
          }
          continue;
        }
        if ((attributeName === "start" || attributeName === "end" || attributeName === "comment") && name2 === "stackTrace") {
          attributeValue = JSON.stringify(attributeValue);
        }
        if (skipEmptyPrefixes && attributeName === "prefix" && attributeValue === "") {
          continue;
        }
        documentWriter.setAttributeNS(
          element,
          namespaceUri,
          PREFERRED_PREFIX_BY_NAMESPACEURI[namespaceUri] + ":" + attributeName,
          attributeValue
        );
      }
    }
    firstChildIndex = 2;
  }
  for (let i4 = firstChildIndex, l3 = jsonml.length; i4 < l3; ++i4) {
    const node = parseNode(
      documentWriter,
      simpleNodesFactory,
      jsonml[i4],
      namespaceUri,
      skipEmptyPrefixes
    );
    if (node !== null) {
      documentWriter.insertBefore(element, node, null);
    }
  }
  return element;
}
function parseScript(script, options, simpleNodesFactory, documentWriter = domBackedDocumentWriter_default) {
  script = normalizeEndOfLines(script);
  let ast;
  try {
    ast = parseExpression(script, {
      allowXQuery: options["language"] === "XQuery3.1" /* XQUERY_3_1_LANGUAGE */ || options["language"] === "XQueryUpdate3.1" /* XQUERY_UPDATE_3_1_LANGUAGE */ || options["language"] === "XQuery4.0" /* XQUERY_4_0_LANGUAGE */ || options["language"] === "XQueryUpdate4.0" /* XQUERY_UPDATE_4_0_LANGUAGE */,
      version: options["language"] === "XPath4.0" /* XPATH_4_0_LANGUAGE */ || options["language"] === "XQuery4.0" /* XQUERY_4_0_LANGUAGE */ || options["language"] === "XQueryUpdate4.0" /* XQUERY_UPDATE_4_0_LANGUAGE */ ? 4 : 3.1,
      debug: options.debug
    });
  } catch (error) {
    printAndRethrowError(script, error);
  }
  const executionSpecificStaticContext = new ExecutionSpecificStaticContext(
    options["namespaceResolver"] || ((_prefix) => null),
    {},
    options["defaultFunctionNamespaceURI"] === void 0 ? "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */ : options["defaultFunctionNamespaceURI"],
    options["functionNameResolver"] || (() => null)
  );
  const rootStaticContext = new StaticContext(executionSpecificStaticContext);
  const anyModuleDecl = astHelper_default.getFirstChild(ast, ["mainModule", "libraryModule"]);
  const moduleDecl = astHelper_default.getFirstChild(anyModuleDecl, "moduleDecl");
  if (moduleDecl) {
    const prefix2 = astHelper_default.getTextContent(astHelper_default.getFirstChild(moduleDecl, "prefix"));
    const uri = astHelper_default.getTextContent(astHelper_default.getFirstChild(moduleDecl, "uri"));
    rootStaticContext.registerNamespace(prefix2, uri);
  }
  const prolog = astHelper_default.getFirstChild(anyModuleDecl, "prolog");
  if (prolog) {
    processProlog(prolog, rootStaticContext, false, script);
  }
  if (options["annotateAst"] !== false) {
    const context = new AnnotationContext(rootStaticContext);
    annotateAst(ast, context);
  }
  const domFacade2 = new ExternalDomFacade();
  const astAsXML = parseNode(
    documentWriter,
    simpleNodesFactory,
    ast,
    null,
    options.annotateAst === false
  );
  documentWriter.insertBefore(
    astAsXML,
    simpleNodesFactory.createComment(script),
    domFacade2["getFirstChild"](astAsXML)
  );
  return astAsXML;
}

// ../gh/fontoxpath/src/precompileXPath.ts
function precompileXPath(xPathString) {
  return Promise.resolve(xPathString);
}

// ../gh/fontoxpath/src/registerXQueryModule.ts
function registerXQueryModule(moduleString, options = { debug: false, language: "XQuery3.1" /* XQUERY_3_1_LANGUAGE */ }) {
  let parsedModule;
  try {
    parsedModule = parseExpression(moduleString, {
      allowXQuery: true,
      debug: options["debug"],
      version: options.language === "XQuery4.0" /* XQUERY_4_0_LANGUAGE */ || options.language === "XQueryUpdate4.0" /* XQUERY_UPDATE_4_0_LANGUAGE */ ? 4 : 3.1
    });
  } catch (error) {
    printAndRethrowError(moduleString, error);
  }
  annotateAst(parsedModule, new AnnotationContext(void 0));
  const libraryModule = astHelper_default.getFirstChild(parsedModule, "libraryModule");
  if (!libraryModule) {
    throw new Error("XQuery module must be declared in a library module.");
  }
  const moduleDecl = astHelper_default.getFirstChild(libraryModule, "moduleDecl");
  const uriNode = astHelper_default.getFirstChild(moduleDecl, "uri");
  const moduleTargetNamespaceURI = astHelper_default.getTextContent(uriNode);
  const prefixNode = astHelper_default.getFirstChild(moduleDecl, "prefix");
  const moduleTargetPrefix = astHelper_default.getTextContent(prefixNode);
  const namespaceResolver = () => null;
  const staticContext = new StaticContext(
    new ExecutionSpecificStaticContext(
      namespaceResolver,
      /* @__PURE__ */ Object.create(null),
      "http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */,
      createDefaultFunctionNameResolver("http://www.w3.org/2005/xpath-functions" /* FUNCTIONS_NAMESPACE_URI */)
    )
  );
  staticContext.registerNamespace(moduleTargetPrefix, moduleTargetNamespaceURI);
  const prolog = astHelper_default.getFirstChild(libraryModule, "prolog");
  if (prolog !== null) {
    let moduleDeclaration;
    try {
      moduleDeclaration = processProlog(prolog, staticContext, true, moduleString);
    } catch (error) {
      printAndRethrowError(moduleString, error);
    }
    moduleDeclaration.functionDeclarations.forEach(({ namespaceURI }) => {
      if (moduleTargetNamespaceURI !== namespaceURI) {
        throw new Error(
          "XQST0048: Functions and variables declared in a module must reside in the module target namespace."
        );
      }
    });
    loadModuleFile(moduleTargetNamespaceURI, moduleDeclaration);
  } else {
    loadModuleFile(moduleTargetNamespaceURI, {
      functionDeclarations: [],
      variableDeclarations: [],
      // No static analysis needed: there is no prolog
      performStaticAnalysis: null,
      source: moduleString
    });
  }
  return moduleTargetNamespaceURI;
}

// ../gh/fontoxpath/src/index.ts
var partiallyParsedXPathCache = /* @__PURE__ */ new Map();
function parseXPath(xpathExpression) {
  const cachedExpression = getAnyStaticCompilationResultFromCache(xpathExpression, null, false);
  if (cachedExpression) {
    return cachedExpression;
  }
  if (partiallyParsedXPathCache.has(xpathExpression)) {
    return partiallyParsedXPathCache.get(xpathExpression);
  }
  const ast = typeof xpathExpression === "string" ? parseExpression(xpathExpression, { allowXQuery: false, version: 4 }) : (
    // AST is an element: convert to jsonml
    convertXmlToAst(xpathExpression)
  );
  const queryBody = astHelper_default.followPath(ast, ["mainModule", "queryBody", "*"]);
  if (queryBody === null) {
    throw new Error("Library modules do not have a specificity");
  }
  const expression = compileAstToExpression_default(queryBody, {
    allowUpdating: false,
    allowXQuery: false
  });
  partiallyParsedXPathCache.set(xpathExpression, expression);
  return expression;
}
function getBucketForSelector(xpathExpression) {
  return parseXPath(xpathExpression).getBucket();
}
function compareSpecificity(xpathExpressionA, xpathExpressionB) {
  return parseXPath(xpathExpressionA).specificity.compareTo(
    parseXPath(xpathExpressionB).specificity
  );
}
var domFacade = new ExternalDomFacade();
if (typeof fontoxpathGlobal !== "undefined") {
  fontoxpathGlobal["compareSpecificity"] = compareSpecificity;
  fontoxpathGlobal["compileXPathToJavaScript"] = compileXPathToJavaScript_default;
  fontoxpathGlobal["domFacade"] = domFacade;
  fontoxpathGlobal["evaluateXPath"] = evaluateXPath_default;
  fontoxpathGlobal["evaluateXPathToArray"] = evaluateXPathToArray;
  fontoxpathGlobal["evaluateXPathToAsyncIterator"] = evaluateXPathToAsyncIterator;
  fontoxpathGlobal["evaluateXPathToBoolean"] = evaluateXPathToBoolean;
  fontoxpathGlobal["evaluateXPathToFirstNode"] = evaluateXPathToFirstNode;
  fontoxpathGlobal["evaluateXPathToMap"] = evaluateXPathToMap;
  fontoxpathGlobal["evaluateXPathToNodes"] = evaluateXPathToNodes;
  fontoxpathGlobal["evaluateXPathToNumber"] = evaluateXPathToNumber;
  fontoxpathGlobal["evaluateXPathToNumbers"] = evaluateXPathToNumbers;
  fontoxpathGlobal["evaluateXPathToString"] = evaluateXPathToString;
  fontoxpathGlobal["evaluateXPathToStrings"] = evaluateXPathToStrings;
  fontoxpathGlobal["evaluateUpdatingExpression"] = evaluateUpdatingExpression;
  fontoxpathGlobal["evaluateUpdatingExpressionSync"] = evaluateUpdatingExpressionSync;
  fontoxpathGlobal["executeJavaScriptCompiledXPath"] = executeJavaScriptCompiledXPath_default;
  fontoxpathGlobal["executePendingUpdateList"] = executePendingUpdateList;
  fontoxpathGlobal["getBucketForSelector"] = getBucketForSelector;
  fontoxpathGlobal["getBucketsForNode"] = getBucketsForNode;
  fontoxpathGlobal["precompileXPath"] = precompileXPath;
  fontoxpathGlobal["registerXQueryModule"] = registerXQueryModule;
  fontoxpathGlobal["registerCustomXPathFunction"] = registerCustomXPathFunction;
  fontoxpathGlobal["parseScript"] = parseScript;
  fontoxpathGlobal["profiler"] = profiler;
  fontoxpathGlobal["createTypedValueFactory"] = createTypedValueFactory;
  fontoxpathGlobal["finalizeModuleRegistration"] = performStaticCompilationOnModules;
  fontoxpathGlobal["Language"] = Language;
  fontoxpathGlobal["ReturnType"] = ReturnType;
}
var createTypedValueFactory2 = createTypedValueFactory;
export {
  Language,
  ReturnType,
  compareSpecificity,
  compileXPathToJavaScript_default as compileXPathToJavaScript,
  createTypedValueFactory2 as createTypedValueFactory,
  domFacade,
  evaluateUpdatingExpression,
  evaluateUpdatingExpressionSync,
  evaluateXPath_default as evaluateXPath,
  evaluateXPathToArray,
  evaluateXPathToAsyncIterator,
  evaluateXPathToBoolean,
  evaluateXPathToFirstNode,
  evaluateXPathToMap,
  evaluateXPathToNodes,
  evaluateXPathToNumber,
  evaluateXPathToNumbers,
  evaluateXPathToString,
  evaluateXPathToStrings,
  executeJavaScriptCompiledXPath_default as executeJavaScriptCompiledXPath,
  executePendingUpdateList,
  performStaticCompilationOnModules as finalizeModuleRegistration,
  getBucketForSelector,
  getBucketsForNode,
  parseScript,
  precompileXPath,
  profiler,
  registerCustomXPathFunction,
  registerXQueryModule
};
