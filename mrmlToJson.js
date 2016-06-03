//external module
var fs = require('fs');
var uuid = require ('uuid');
var chalk = require('chalk');
var sha = require('sha-1');
var canonicalJSON = require('canonical-json');

//define hash function
function getHash (obj) {
    return sha(canonicalJSON(obj));
}

//defining chalk style
var errorLog = chalk.red.bold;
var successLog = chalk.green;
var warningLog = chalk.yellow;

//global vars
var extractedHierarchy,
    buildHierarchy,
    writeJSONFile,
    JSONResult = [],
    initialDate = Date.now(),
    defaultLabelMap = null,
    labelMapExceptions = [];

//parameters
var config = require('../configMrmlToJson.js');
var mrmlFileLocation = config.mrmlFileLocation;
var colorTableFileLocation = config.colorTableFileLocation;
var vtkFilesDirectory = config.vtkFilesDirectory;
var jsonResultFileName = config.jsonResultFileName;

//------------------------------------------------- DEFINING HEADER -------------------------------------------------//
var header = config.header;
header['@id'] = uuid.v4();
JSONResult.push(header);



//--------------------------------------- BUILD HIERARCHY FROM THE MRML FILE ----------------------------------------//


(function launchPythonScript() {
    require('child_process').exec(
        'python mrml-extract-hierarchy.py '+mrmlFileLocation+' '+colorTableFileLocation,
        function () {
            fs.readFile('extractedHierarchy.json', function (err, data) {
                if (err) {
                    console.log(errorLog('Error while opening extracted hierarchy :'),err);
                }
                else {
                    extractedHierarchy = JSON.parse(data);
                    addNRRDFiles();
                    buildHierarchy();
                }
            });
        }
    );
})();

function addNRRDFiles () {
    var backgroundImagesNames = config.backgroundImages,
        labelMapNames = config.labelMapFiles,
        name,
        object,
        i,
        backgroundIds = [];

    function getNRRDDatasource (source) {
        var val = { "@id" : uuid.v4(), "@type" : "DataSource", "mimeType": "application/x-nrrd", "source" : source};
        if (config.filesDisplayName && config.filesDisplayName[source]) {
            val.displayName = config.filesDisplayName[source];
        }
        return val;
    }

    if (Array.isArray(backgroundImagesNames)) {
        for (i = 0; i < backgroundImagesNames.length; i++) {
            name = backgroundImagesNames[i];
            object = getNRRDDatasource(name);
            backgroundIds.push(object["@id"]);
            JSONResult.push(object);
        }
        header.backgroundImage = backgroundIds;
    }
    else {
        object = getNRRDDatasource(backgroundImagesNames);
        header.backgroundImage = object["@id"];
        JSONResult.push(object);
    }

    if (Array.isArray(labelMapNames)) {
        for (i = 0; i < labelMapNames.length; i++) {
            name = labelMapNames[i].name;
            object = getNRRDDatasource(name);
            if (Array.isArray(labelMapNames[i].includes)) {
                for (var j = 0; j < labelMapNames[i].includes; j++) {
                    labelMapExceptions[labelMapNames[i].includes[j]] = object;
                }
            }
            else if (labelMapNames[i].includes === '*' && !defaultLabelMap) {
                defaultLabelMap = object;
            }
            JSONResult.push(object);

        }
    }
    else {
        //only one label map
        object = getNRRDDatasource(labelMapNames);
        defaultLabelMap = object;
        JSONResult.push(object);
    }
}

function getLabelFromModelName (modelName) {

    var reg = /Model_(\d+)/;
    var result = modelName.match(reg);
    return result && Number(result[1]);

}

function buildHierarchy () {
    if (extractedHierarchy) {
        for (var label in extractedHierarchy.nodes) {
            if (label in extractedHierarchy.Hierarchies.__default__) {
                //then its a group

                var group = {
                    "@id" : uuid.v4(),
                    "@type" : "Group",
                    "annotation" : {
                        name : extractedHierarchy.nodes[label].name
                    },
                    member : extractedHierarchy.Hierarchies.__default__[label].children //store the reference of the hierarchy node to retrieve uuid once every group is created
                };
                if (extractedHierarchy.Hierarchies.__default__.__root__.children.indexOf(label) > -1) {
                    //group is at the root so we add it to the list of root groups in the header
                    header.root.push(group['@id']);
                }
                extractedHierarchy.nodes[label].uuid = group['@id'];
                JSONResult.push(group);
            }
            else {
                //it has to be a structure

                var dataSource = {
                    "@id" : uuid.v4(),
                    "@type" : "DataSource",
                    "mimeType": "application/octet-stream",
                    "source": vtkFilesDirectory+extractedHierarchy.nodes[label].modelFile
                };

                var dataKey = getLabelFromModelName(extractedHierarchy.nodes[label].modelFile);
                var labelMapDatasource = labelMapExceptions[dataKey] || defaultLabelMap;
                var labelMapSelector = {
                    "@type" : ["Selector", "LabelMapSelector"],
                    dataKey : dataKey,
                    dataSource : labelMapDatasource['@id'],
                    authoritative : true
                };

                var structure = {
                    "@id" : uuid.v4(),
                    "@type" : "Structure",
                    "annotation" : {
                        name : extractedHierarchy.nodes[label].name
                    },
                    "sourceSelector" : [{
                        "@type" : ["Selector", "GeometrySelector"],
                        dataSource : dataSource['@id']
                    }, labelMapSelector],
                    "renderOption" : {
                        color : extractedHierarchy.nodes[label].color
                    }
                };



                extractedHierarchy.nodes[label].uuid = structure['@id'];

                JSONResult.push(dataSource);
                JSONResult.push(structure);

            }
        }
        //at this point, every object is created, we just need to retrieve uuid of the members of the groups
        var _getNodeUuid = memberLabel => extractedHierarchy.nodes[memberLabel].uuid;
        for (var i = 0; i<JSONResult.length; i++) {
            var item = JSONResult[i];
            if (item['@type']==='Group') {
                item.member = item.member.map(_getNodeUuid);
            }
        }
        buildHierarchy.done = true;
        writeJSONFile();
    }
}

//---------------------------------------------- GENERATE HASH VERSION ----------------------------------------------//

function generateHashVersion () {
    var JSONHash = JSON.parse(JSON.stringify(JSONResult));
    var uuids = {};
    var hashed = {};
    var i;

    for (i = 0; i < JSONHash.length; i++) {
        uuids[JSONHash[i]['@id']] = JSONHash[i];
    }


    function hashify (obj, returnString) {
        if (hashed[obj['@id']]) {
            return obj['@id'];
        }
        for (var key in obj) {
            if (typeof obj[key] === 'string' && uuids[obj[key]] && key !== '@id') {
                obj[key] = hashify(uuids[obj[key]], true);
            }
            else if (Array.isArray(obj[key])) {
                for (var i = 0; i < obj[key].length; i++) {
                    if (typeof obj[key][i] === 'string' && uuids[obj[key][i]]) {
                        obj[key][i] = hashify(uuids[obj[key][i]], true);
                    }
                    else if (typeof obj[key][i] === 'object') {
                        obj[key][i] = hashify(obj[key][i], false);
                    }
                }
            }
            else if (typeof obj[key] === 'object') {
                obj[key] = hashify(obj[key], false);
            }
        }
        if (returnString) {
            delete obj["@id"];
            var hash = getHash(obj);
            obj["@id"] = hash;
            hashed[hash] = true;
            return hash;
        }
        return obj;
    }

    JSONHash[0]['@id'] = hashify(JSONHash[0], true);

    return JSONHash;


}

//------------------------------------------------ WRITING JSON FILE ------------------------------------------------//
function writeJSONFile () {
    if (buildHierarchy.done) {
        fs.writeFile(jsonResultFileName, JSON.stringify(JSONResult, null, 4), function(err) {
            if(err) {
                return console.log(errorLog('Error while writing atlas structure : '), err);
            }

            console.log(successLog("The JSON file was saved!"));
            console.log('done in '+(Date.now()-initialDate)+'ms');
        });

        var JSONLD = {
            "@context" : config['@context'],
            "@graph" : JSONResult
        };

        fs.writeFile(config.jsonLDResultFileName, JSON.stringify(JSONLD, null, 4), function(err) {
            if(err) {
                return console.log(errorLog('Error while writing atlas structure LD : '), err);
            }

            console.log(successLog("The JSON LD file was saved!"));
            console.log('done in '+(Date.now()-initialDate)+'ms');
        });

        fs.writeFile(config.jsonHashResultFileName, JSON.stringify(generateHashVersion(), null, 4), function(err) {
            if(err) {
                return console.log(errorLog('Error while writing atlas structure hash version : '), err);
            }

            console.log(successLog("The JSON hash file was saved!"));
            console.log('done in '+(Date.now()-initialDate)+'ms');
        });
    }
}
