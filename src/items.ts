import items from '../data/items.json'

enum ITEM_TYPE
{
    NONE,
    BACKGROUND,
    FOREGROUND,
    TREE,
    EQUIPPABLE,
    INTERACTABLE
}

function item_from_id(id:number)
{
    return items[id] || {
        "name": "Unknown #" + id,
        "info": "Unknown Item with ID " + id,
        "type": 0,
        "part": 0,
        "rarity": 0,
        "hardness": 0,
        "farmability": 0,
        "check": 20
      }
}

function item_id_from_name(name:string)
{
    let item_id:number = 0;

    for(const item in items)
    {
        if (items[item].name === name)
        {
            item_id = +item
            break;
        }
    }

    return item_id
}

export {ITEM_TYPE, item_from_id, item_id_from_name}