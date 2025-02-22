import { DataTypes, Model } from "sequelize";
import sequelize from "../sequelize";

// Define World model
class World extends Model {
  public id!: number;
  public name!: string;
  public owner!: string;
  public locked!: boolean;
  public admins!: string[];
  public theme!: number;
}

// Initialize model
World.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    owner: {
        type: DataTypes.STRING,
        allowNull: true
    },
    theme: {
      type: DataTypes.NUMBER,
      defaultValue: 0
    },
    admins: {
        type: DataTypes.TEXT,
        defaultValue: "[]",
        get() {
            // Parse JSON string back to array
            const rawValue = this.getDataValue("admins");
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value: string[]) {
            // Convert array to JSON string before saving
            this.setDataValue("admins", JSON.stringify(value));
        },
    }
  },
  {
    sequelize,
    tableName: "world",
  }
);

export default World;
