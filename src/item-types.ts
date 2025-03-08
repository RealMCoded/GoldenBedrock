import { items } from './item-id'

interface item_data
{
    name: string,
    info: string,
    type: ITEM_TYPE,
    body_layer: BODY_LAYER,
    rarity: number,
    farmability: number,
    hardness: number,
    can_trade: boolean,
    can_trash: boolean,
    can_drop: boolean,
    can_lock: boolean,
    is_solid: boolean
}

const enum BODY_LAYER
{
    none,
    back, //things like capes, wings
    hair,
    headwear, //caps, hats
    eyewear, //visors, sunglasses
    shirt,
    pants,
    hand, //fishing rods, pickaxes
    footwear, //shoes
    skin, //rainbow skin, invisible skin
    pets,
    car,
    neckwear, //scarfs
    facewear //beards, masks
}

const enum ITEM_TYPE
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
        name: "Unknown #" + id,
        info: "Unknown Item with ID " + id,
        type: ITEM_TYPE.NONE,
        body_layer: BODY_LAYER.none,
        rarity: 0,
        farmability: 0,
        hardness: 0,
        can_trade: false,
        can_trash: true,
        can_drop: false,
        can_lock: false,
        is_solid: false
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

export {BODY_LAYER, ITEM_TYPE, item_data, item_from_id, item_id_from_name}