import items from '../data/items.json'

function item_from_id(id:number)
{
    return items[id]
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

export {item_from_id, item_id_from_name}