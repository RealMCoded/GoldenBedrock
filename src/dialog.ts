class Dialog
{
    name:string;
    elements:Buffer[]= [];

    constructor(name:string = "menu.generic")
    {
        this.name = name;
        
        let worker_buffer, name_buffer

        worker_buffer = Buffer.alloc(2);
        worker_buffer.writeUInt16LE(0, 0);

        name_buffer = Buffer.from(name + "\0", 'utf-8')

        this.elements.push(worker_buffer, name_buffer)
    }

    Text(line_break:boolean, text:string, text_scale:number)
    {
        let id_buffer, lineBreak_buffer, text_buffer, scale_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(1, 0);

        lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        text_buffer = Buffer.from(text + "\0", 'utf-8')

        scale_buffer = Buffer.alloc(2)
        scale_buffer.writeUint16LE(text_scale, 0)

        this.elements.push(id_buffer, lineBreak_buffer, text_buffer, scale_buffer)
        return this;
    }

    Item(line_break:boolean, index:number, count:number, width:number, height:number)
    {
        let id_buffer, lineBreak_buffer, index_buffer, count_buffer, width_buffer, height_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(2, 0);

        lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        index_buffer = Buffer.alloc(2)
        index_buffer.writeUint16LE(index, 0)

        count_buffer = Buffer.alloc(2)
        count_buffer.writeUint16LE(count, 0)

        width_buffer = Buffer.alloc(2)
        width_buffer.writeUint16LE(width, 0)

        height_buffer = Buffer.alloc(2)
        height_buffer.writeUint16LE(height, 0)

        this.elements.push(id_buffer, lineBreak_buffer, index_buffer, count_buffer, width_buffer, height_buffer)
        return this;
    }

    ItemText(line_break:boolean, text:string, text_scale:number, icon:number)
    {
        let id_buffer, lineBreak_buffer, text_buffer, scale_buffer, item_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(3, 0);

        lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        text_buffer = Buffer.from(text + "\0", 'utf-8')

        scale_buffer = Buffer.alloc(2)
        scale_buffer.writeUint16LE(text_scale, 0)

        item_buffer = Buffer.alloc(2)
        item_buffer.writeUint16LE(icon, 0)

        this.elements.push(id_buffer, lineBreak_buffer, text_buffer, scale_buffer, item_buffer)
        return this;
    }

    Button(line_break:boolean, name:string, text:string)
    {
        let id_buffer, lineBreak_buffer, name_buffer, text_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(4, 0);

        lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        name_buffer = Buffer.from(name + "\0", 'utf-8')
        text_buffer = Buffer.from(text + "\0", 'utf-8')

        this.elements.push(id_buffer, lineBreak_buffer, name_buffer, text_buffer)
        return this;
    }

    TextBox(line_break:boolean, name:string, text:string, length:number)
    {
        let id_buffer, lineBreak_buffer, name_buffer, text_buffer, length_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(5, 0);

        lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        name_buffer = Buffer.from(name + "\0", 'utf-8')
        text_buffer = Buffer.from(text + "\0", 'utf-8')

        length_buffer = Buffer.alloc(1)
        length_buffer.writeUint8(length)

        this.elements.push(id_buffer, lineBreak_buffer, name_buffer, text_buffer, length_buffer)
        return this;
    }

    CheckBox(line_break:boolean, value:boolean, name:string, text:string, size:number)
    {
        let id_buffer, lineBreak_buffer, value_buffer, name_buffer, text_buffer, length_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(6, 0);

        lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        value_buffer = Buffer.alloc(1);
        value_buffer.writeUInt8(+value);

        name_buffer = Buffer.from(name + "\0", 'utf-8')
        text_buffer = Buffer.from(text + "\0", 'utf-8')

        length_buffer = Buffer.alloc(2)
        length_buffer.writeUint16LE(size)

        this.elements.push(id_buffer, lineBreak_buffer, name_buffer, text_buffer, length_buffer)
        return this;
    }

    Color(line_break:boolean, name:string, width:number, height:number, red:number, green:number, blue:number)
    {
        let id_buffer, lineBreak_buffer, name_buffer, width_buffer, height_buffer, red_buffer, green_buffer, blue_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(7, 0);

        lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        name_buffer = Buffer.from(name + "\0", 'utf-8')

        width_buffer = Buffer.alloc(2)
        width_buffer.writeUint16LE(width, 0)

        height_buffer = Buffer.alloc(2)
        height_buffer.writeUint16LE(height, 0)

        red_buffer = Buffer.alloc(2)
        red_buffer.writeUint16LE(red, 0)
        green_buffer = Buffer.alloc(2)
        green_buffer.writeUint16LE(green, 0)
        blue_buffer = Buffer.alloc(2)
        blue_buffer.writeUint16LE(blue, 0)

        this.elements.push(id_buffer, lineBreak_buffer, name_buffer, width_buffer, height_buffer, red_buffer, green_buffer, blue_buffer)
        return this;
    }

    ItemBox(line_break:boolean, name:string, item:number, width:number, height:number)
    {
        let id_buffer, lineBreak_buffer, name_buffer, item_buffer, width_buffer, height_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(8, 0);

        lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        name_buffer = Buffer.from(name + "\0", 'utf-8')

        item_buffer = Buffer.alloc(2)
        item_buffer.writeUint16LE(item, 0)

        width_buffer = Buffer.alloc(2)
        width_buffer.writeUint16LE(width, 0)

        height_buffer = Buffer.alloc(2)
        height_buffer.writeUint16LE(height, 0)

        this.elements.push(id_buffer, lineBreak_buffer, name_buffer, item_buffer, width_buffer, height_buffer)
        return this;
    }

    //Element 9 doesnt have any code.

    //TODO: Add elements 10, 11, and 12.
}

export {Dialog}