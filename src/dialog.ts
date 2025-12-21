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

    /**
     * Renders dialog text
     * @param line_break Adds a page break after this element
     * @param text String to render
     * @param text_scale Scale of the text
     * @returns Dialog
     */
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

    /**
     * Renders an item slot in the dialog (Cannot be interacted with)
     * @param line_break Adds a page break after this element
     * @param index Item index
     * @param count Item count
     * @param width Width of the item sprite
     * @param height Height of the item sprite
     * @returns Dialog
     */
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

    /**
     * Renders text, with an item icon on the left side
     * @param line_break Adds a page break after this element
     * @param text Text to render
     * @param text_scale Text scale
     * @param icon Item Index
     * @returns Dialog
     */
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

    /**
     * Creates a button in the dialog
     * @param line_break Adds a page break after this element
     * @param name Callback name for the button
     * @param text Rendered text on the button
     * @returns Dialog
     */
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

    /**
     * Creates a text box in the dialog
     * @param line_break Adds a page break after this element
     * @param name Callback name for the text box
     * @param text Placeholder text
     * @param length String length limit (also sets the width of the text box)
     * @returns Dialog
     */
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

    /**
     * Creates a checkbox in the dialog. Renders text next to the checkbox.
     * @param line_break Adds a page break after this element
     * @param value Default value of the checkbox
     * @param name Callback name for the checkbox
     * @param text Text to render
     * @param size Size of the element
     * @returns Dialog
     */
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

        this.elements.push(id_buffer, lineBreak_buffer, value_buffer, name_buffer, text_buffer, length_buffer)
        return this;
    }

    /**
     * Renders a color box button in the dialog
     * @param line_break Adds a page break after this element
     * @param name Callback name for the color box
     * @param width Width of the color box
     * @param height Height of the color box
     * @param red Red color value
     * @param green Green color value
     * @param blue Blue color value
     * @returns Dialog
     */
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

    /**
     * Creates an interactable item box in the dialog
     * @param line_break Adds a page break after this element
     * @param name Callback name for the item box
     * @param item Item ID
     * @param width Width of the item box
     * @param height Height of the item box
     * @returns Dialog
     */
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

    /**
     * Create a page break in the dialog
     * @param line_break
     * @returns Dialog
     */
    PageBreak(line_break:boolean)
    {
        let id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(9, 0);

        let lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        this.elements.push(id_buffer, lineBreak_buffer)
        return this;
    }

    /**
     * Creates an achievement component in the dialog
     * @param line_break Adds a page break after this element
     * @param icon Icon index
     * @param name Achievement Name (Rendered as big text)
     * @param text Achievement Description (Rendered as small text, under the name)
     * @param info Achievement progress (Shown on the right side)
     * @returns Dialog
     */
    Achievement(line_break:boolean, icon:Icon, name:string, text:string, info:string)
    {
        let id_buffer, lineBreak_buffer, icon_buffer, name_buffer, text_buffer, info_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(10, 0);

        lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        icon_buffer = Buffer.alloc(2)
        icon_buffer.writeUint16LE(icon, 0)

        name_buffer = Buffer.from(name + "\0", 'utf-8')
        text_buffer = Buffer.from(text + "\0", 'utf-8')
        info_buffer = Buffer.from(info + "\0", 'utf-8')

        this.elements.push(id_buffer, lineBreak_buffer, icon_buffer, name_buffer, text_buffer, info_buffer)
        return this;
    }

    /**
     * Renders an item button in the dialog
     * @param line_break Adds a page break after this element
     * @param name Callback name for the button
     * @param item Item ID
     * @param width Width of the button
     * @param height Height of the button
     * @returns Dialog
     */
    ItemButton(line_break:boolean, name:string, item:number, width:number, height:number)
    {
        let id_buffer, lineBreak_buffer, name_buffer, item_buffer, width_buffer, height_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(11, 0);

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

    /**
     * Creates an icon button in the dialog
     * @param line_break Adds a page break after this element
     * @param name Callback name for the button
     * @param icon Icon ID
     * @param width Width of the button
     * @param height Height of the button
     * @returns Dialog
     */
    IconButton(line_break:boolean, name:string, icon:Icon, width:number, height:number)
    {
        let id_buffer, lineBreak_buffer, name_buffer, item_buffer, width_buffer, height_buffer;

        id_buffer = Buffer.alloc(2);
        id_buffer.writeUInt16LE(12, 0);

        lineBreak_buffer = Buffer.alloc(1);
        lineBreak_buffer.writeUInt8(+line_break);

        name_buffer = Buffer.from(name + "\0", 'utf-8')

        item_buffer = Buffer.alloc(2)
        item_buffer.writeUint16LE(icon, 0)

        width_buffer = Buffer.alloc(2)
        width_buffer.writeUint16LE(width, 0)

        height_buffer = Buffer.alloc(2)
        height_buffer.writeUint16LE(height, 0)

        this.elements.push(id_buffer, lineBreak_buffer, name_buffer, item_buffer, width_buffer, height_buffer)
        return this;
    }
}

export {Dialog}