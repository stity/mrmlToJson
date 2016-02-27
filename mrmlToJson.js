//external module
var fs = require('fs');
var uuid = require ('uuid');
var chalk = require('chalk');

//defining chalk style
var errorLog = chalk.red.bold;
var successLog = chalk.green;
var warningLog = chalk.yellow;

//global vars
var nrrdConversion,
    nrrdParser,
    vtkConversion,
    vtkFiles,
    vtkAtlasTSV,
    colorCheck,
    extractedHierarchy,
    buildHierarchy,
    writeJSONFile,
    hncma = {},
    skin = {},
    hncmaAtlasTSV,
    hncmaColorTable,
    JSONResult = [],
    initialDate = Date.now();

//parameters
var config = require('../configMrmlToJson.js');
var mrmlFileLocation = config.mrmlFileLocation;
var colorTableFileLocation = config.colorTableFileLocation;
var vtkFilesDirectory = config.vtkFilesDirectory;
var jsonResultFileName = config.jsonResultFileName;

//------------------------------------------------- DEFINING HEADER -------------------------------------------------//
var header = {
    "@type": "header",
    "species": "human",
    "organ": "knee",
    "name" : "SPL Knee Atlas",
    "license" : "?",
    "citation" : "?",
    "version" : "1",
    "contact" : "",
    "comment" : "",
    "coordinate_system" : "self defined"
};
JSONResult.push(header);



//--------------------------------------- BUILD HIERARCHY FROM THE MRML FILE ----------------------------------------//

function getUidFromStructureName (name) {
    var matchingStructures = JSONResult.filter(item => item['@type']==="structure" && item.annotation.name===name);
    if (matchingStructures.length > 1) {
        //keep only structures with no data key ie vtk file
        matchingStructures = matchingStructures.filter(item => item.sourceSelector && item.sourceSelector.dataKey===undefined);
        if (matchingStructures.length > 1) {
            throw 'Several sturctures matching the same name : '+name;
        }
    }
    if (matchingStructures.length === 0) {
        throw 'No structure matches the given name : '+name;
    }
    return matchingStructures[0]['@id'];
}

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
                    buildHierarchy();
                }
            })
        }
    );
})()

function buildHierarchy () {
    if (extractedHierarchy) {
        for (var label in extractedHierarchy.nodes) {
            if (label in extractedHierarchy.Hierarchies['__default__']) {
                //then its a group

                var group = {
                    "@id" : uuid.v4(),
                    "@type" : "group",
                    "annotation" : {
                        name : extractedHierarchy.nodes[label].name
                    },
                    members : extractedHierarchy.Hierarchies['__default__'][label].children //store the reference of the hierarchy node to retrieve uuid once every group is created
                };
                if (extractedHierarchy.Hierarchies['__default__']['__root__'].children.indexOf(label) > -1) {
                    //group is at the root so we create a root annotation to be able to easily built the tree later
                    group.root = true;
                }
                extractedHierarchy.nodes[label].uuid = group['@id'];
                JSONResult.push(group);
            }
            else {
                //it has to be a structure

                var dataSource = {
                    "@id" : uuid.v4(),
                    "@type" : "datasource",
                    "mimeType": "application/octet-stream",
                    "source": vtkFilesDirectory+extractedHierarchy.nodes[label].modelFile
                };

                var structure = {
                    "@id" : uuid.v4(),
                    "@type" : "structure",
                    "annotation" : {
                        name : extractedHierarchy.nodes[label].name
                    },
                    "sourceSelector" : {
                        dataSource : dataSource['@id']
                    },
                    "renderOptions" : {
                        color : extractedHierarchy.nodes[label].color
                    }
                };
                
                extractedHierarchy.nodes[label].uuid = structure['@id'];
                
                JSONResult.push(dataSource);
                JSONResult.push(structure);
                
            }
        }
        //at this point, every object is created, we just need to retrieve uuid of the members of the groups
        for (var i = 0; i<JSONResult.length; i++) {
            var item = JSONResult[i];
            if (item['@type']==='group') {
                item.members = item.members.map(memberLabel => extractedHierarchy.nodes[memberLabel].uuid);
            }
        }
        buildHierarchy.done = true;
        writeJSONFile();
    }
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
    }
}