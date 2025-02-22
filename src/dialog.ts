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
}

export {Dialog}