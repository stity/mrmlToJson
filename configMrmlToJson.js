//all the path given relatively to mrmlToJson.js script
module.exports = {
    mrmlFileLocation : "",
    colorTableFileLocation : "",
    vtkFilesDirectory : "",
    jsonResultFileName : "atlasStructure.json",
    jsonLDResultFileName : "atlasStructureLD.json",
    jsonHashResultFileName : "atlasStructureLD.json",
    filesDisplayName : {},
    header : {
        "@type": "Header",
        "species": "human",
        "organ": "",
        "name" : "",
        "license" : "?",
        "citation" : "?",
        "version" : "1",
        "contact" : "",
        "comment" : "",
        "coordinateSystem" : "self defined",
        "root" : []
    },
    labelMapFiles : [{ // can be a list of objects or just a name (if there is only one labelmap)
        name : "",
        includes : [] // a list of label exception [1,23,854, ...] or just "*" which mean that this the default file to look in which means that there can only be only one file with "*" as includes value
    }],
    "backgroundImages" : "", //can be a name or a list of names
    "@context" : { // for JSON LD compatibility, specify places where aplication expect a reference
        "@vocab": "http://www.openanatomy.org/schema/v1/#",
        "backgroundImage": {
            "@type": "@id"
        },
        "root": {
            "@type": "@id"
        },
        "member": {
            "@type": "@id"
        },
        "dataSource": {
            "@type": "@id"
        },
        "sourceSelector": {
            "@type": "@id"
        },
        "annotation": {
            "@type": "@id"
        },
        "renderOption": {
            "@type": "@id"
        }
    }

};
