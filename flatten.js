#!node

var fs = require('fs');

// can't be a set, since we choose in priority order
const nameAttributes = ['name', 'spellname', 'atkname', 'itemname'];

// all these are removed values
const idRelated = new Set(['rollcontent', 'spellattackid', 'spellid']);

function removeIdAttribute(dict, path) {
    delete dict['id'];
}

function walkArray(array, handler, path) {
    for (let item of array) {
        walk(item, handler, path);
        handler(item, path);
    }
    return array.length;
}

function walk(node, handler, path) {
    path = path || '';
    let children = 0;
    for (let childName in node) {
        if (!node.hasOwnProperty(childName)) continue;
        let child = node[childName];
        let childPath = path + "." + childName
        switch (typeof child) {
            case 'object': 
                if (child instanceof Array) {
                    // console.log("%s array of size %d", childPath, child.length);
                    children += walkArray(child, handler, childPath);
                } else {
                    // console.log("%s object", childPath);
                    walk(child, handler, childPath);
                    handler(child, childPath);
                    children++;
                }
                break;
            default:
                // console.log("%s %s", childPath, typeof child);
        }
    }
}

function printName(dict, path) {
    let name = dict['name'];
    if (name === undefined) {
        return;
    }
    console.log(name);
}

let single = [];
let repeating = {};

function separateRepeatingAttributes(node, path) {
    let parts = node.name.match(/repeating_([^_]+)_([^_]+)_(.+)$/);
    if (parts === null) {
        single.push(node.name + " = " + node.current);
        return;
    }
    let category = parts[1];
    let categoryDict = repeating[category];
    if (!categoryDict) {
        categoryDict = {}
        repeating[category] = categoryDict;
    }
    let key = parts[2];
    let keyDict = categoryDict[key];
    if (!keyDict) {
        keyDict = {};
        categoryDict[key] = keyDict;
    }
    let property = parts[3];
    keyDict[property] = node.current;
    // console.log(parts[1], parts[2], parts[3]);
}

function output(line) {
    console.log(line.replace(/[\n\r]+/g, ''));
    // .substr(0, 120))
}

function parse(err, data) {
    let root = JSON.parse(data);
    walk(root, removeIdAttribute);
    walk(root, separateRepeatingAttributes);
    // console.log(root);
    single.sort();
    for (line of single) {
        output(line);
    }

    let repeatingFlat = [];
    for (category in repeating) {
        let categoryDict = repeating[category];
        for (key in categoryDict) {
            let object = categoryDict[key];
            let name = key;
            for (nameProperty of nameAttributes) {
                if (object.hasOwnProperty(nameProperty)) {
                    name = object[nameProperty];
                    break;
                }
            }
            for (property in object) {
                if (idRelated.has(property)) {
                    continue;
                }
                let value = object[property];
                if (value === undefined) {
                    continue;
                }
                repeatingFlat.push(category + "[" + name + "]." + property + " = " + value);
            }
        }
    }
    repeatingFlat.sort();
    for (line of repeatingFlat) {
        output(line);
    }
}

fs.readFile(process.argv[2], parse);
