// dictionary mapping towns to a region
var town_to_region_dict = {};
town_to_region_dict[""] = 0;
town_to_region_dict["mortsel"] = 1;
town_to_region_dict["geel"] = 4;
town_to_region_dict["olen"] = 2;
town_to_region_dict["westerlo"] = 4;
town_to_region_dict["herentals"] = 2;
town_to_region_dict["kasterlee"] = 3;
town_to_region_dict["lille"] = 3;
town_to_region_dict["heist-op-den-berg"] = 5;
town_to_region_dict["nijlen"] = 5;
town_to_region_dict["herselt"] = 4;
town_to_region_dict["zoersel"] = 1;
town_to_region_dict["turnhout"] = 3;
town_to_region_dict["beerse"] = 3;
town_to_region_dict["vorselaar"] = 2;
town_to_region_dict["grobbendonk"] = 2;
town_to_region_dict["lier"] = 5;
town_to_region_dict["zandhoven"] = 1;
town_to_region_dict["herenthout"] = 2;
town_to_region_dict["antwerpen"] = 1;
town_to_region_dict["mol"] = 3;
town_to_region_dict["rijkevorsel"] = 3;
town_to_region_dict["hulshout"] = 5;
town_to_region_dict["merksplas"] = 3;
town_to_region_dict["vosselaar"] = 3;
town_to_region_dict["laakdal"] = 4;
town_to_region_dict["kalmthout"] = 7;
town_to_region_dict["oud-turnhout"] = 3;

var nodes = ["mortsel", "geel", "olen", "westerlo", "herentals", "kasterlee", "lille", "heist-op-den-berg", "nijlen", "herselt",
    "zoersel", "turnhout", "beerse", "vorselaar", "grobbendonk", "lier", "zandhoven", "herenthout", "antwerpen", "mol",
    "rijkevorsel", "hulshout", "merksplas", "vosselaar", "laakdal", "kalmthout", "oud-turnhout"];

var edges = [
    ["antwerpen", "mortsel"],
    ["mortsel", "lier"],
    ["lier", "nijlen"],
    ["heist-op-den-berg", "hulshout"],
    ["heist-op-den-berg", "nijlen"],
    ["hulshout", "herselt"],
    ["herselt", "westerlo"],
    ["westerlo", "laakdal"],
    ["westerlo", "olen"],
    ["westerlo", "hulshout"],
    ["westerlo", "geel"],
    ["laakdal", "geel"],
    ["olen", "herentals"],
    ["olen", "herenthout"],
    ["olen", "geel"],
    ["herenthout", "nijlen"],
    ["herenthout", "herentals"],
    ["herenthout", "grobbendonk"],
    ["herentals", "grobbendonk"],
    ["nijlen", "zandhoven"],
    ["nijlen", "grobbendonk"],
    ["zandhoven", "grobbendonk"],
    ["zandhoven", "vorselaar"],
    ["grobbendonk", "vorselaar"],
    ["vorselaar", "herentals"],
    ["vorselaar", "lille"],
    ["vorselaar", "zoersel"],
    ["herentals", "lille"],
    ["herentals", "kasterlee"],
    ["herentals", "westerlo"],
    ["geel", "kasterlee"],
    ["geel", "mol"],
    ["kasterlee", "turnhout"],
    ["kasterlee", "oud-turnhout"],
    ["kasterlee", "vosselaar"],
    ["kasterlee", "lille"],
    ["kasterlee", "olen"],
    ["lille", "beerse"],
    ["lille", "vosselaar"],
    ["rijkevorsel", "merksplas"],
    ["rijkevorsel", "beerse"],
    ["beerse", "merksplas"],
    ["beerse", "vosselaar"],
    ["beerse", "turnhout"],
    ["vosselaar", "turnhout"],
    ["vosselaar", "merksplas"],
    ["turnhout", "oud-turnhout"],
    ["turnhout", "merksplas"]];



function getNeighbors(city, edges) {
    let neighbors = [];
    for (var i = 0; i < edges.length; i++) {
        if (edges[i][0] === city) { neighbors.push(edges[i][1]); }
        if (edges[i][1] === city) { neighbors.push(edges[i][0]); }
    }
    return neighbors;
}



//console.log(getNeighbors("vosselaar", edges));

// TODO: Deze deelgemeenten links van de pijl mogen in de data 
// veranderd worden naar de gemeente waar ze bij horen (rechts van de pijl).

/*
"Bouwel" -> "Grobbendonk"

"Pulle" -> "Zandhoven"

"Poederlee" -> "Lille"
"Wechelderzande" -> "Lille"

"Tielen" -> "Kasterlee"
"Lichtaart" -> "Kasterlee"

"Heultje" -> "Westerlo"
"Tongerlo" -> "Westerlo"
"Oevel" -> "Westerlo"

"Wiekevorst" -> "Heist-op-den-berg"

"Noorderwijk" -> "Herentals"

"Bevel" -> "Nijlen"
"Kessel" -> "Nijlen"

"Vlimmeren" -> "Beerse"
*/