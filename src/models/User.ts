import { DataTypes, Model } from "sequelize";
import sequelize from "../sequelize";

// Define User model
class User extends Model {
  public id!: number;
  public username!: string;
  public displayName!: string;
  public email!: string;
  public token!: string;
  public verified!: boolean;
  public permission!: number;
  public gems!: number;
  public newcurrency!: number;
  public xp!: number;
  public level!: number;
  public lastWorld!: string;
  public options!: object;
  public avatar!: object;
  public inventory!: {slots:number, items:[{index:number, count:number, equipped:number}]};
  public friends!: number[];
  public worlds!: number[];
  public achievements!: number[];
  public moderation!: object;
  public rewards!: object;
}

// Initialize model
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    displayname: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    permission: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    gems: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    newcurrency: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    xp: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    lastWorld: {
      type: DataTypes.STRING,
      defaultValue: "TUTORIAL"
    },
    options: {
      type: DataTypes.JSON,
      defaultValue: {Volume: 100, Sounds: true, Shadow: true, Smooth: true, Full: false}
    },
    avatar: {
      type: DataTypes.JSON,
      defaultValue: {Is_Female: false, Skin: [240, 192, 127]}
    },
    inventory: {
      type: DataTypes.JSON,
      defaultValue: {slots: 30, items: [{index: 1, count: 1, equipped: 0}, {index: 3, count: 1, equipped: 0}]}
    },
    friends: {
      type: DataTypes.TEXT,
      defaultValue: "[]",
      get() {
        // Parse JSON string back to array
        const rawValue = this.getDataValue("friends");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value: string[]) {
        // Convert array to JSON string before saving
        this.setDataValue("friends", JSON.stringify(value));
      },
    },
    achievements: {
      type: DataTypes.TEXT,
      defaultValue: "[]",
      get() {
        // Parse JSON string back to array
        const rawValue = this.getDataValue("achievement");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value: string[]) {
        // Convert array to JSON string before saving
        this.setDataValue("achievement", JSON.stringify(value));
      },
    },
    worlds: {
      type: DataTypes.TEXT,
      defaultValue: "[]",
      get() {
        // Parse JSON string back to array
        const rawValue = this.getDataValue("worlds");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value: string[]) {
        // Convert array to JSON string before saving
        this.setDataValue("worlds", JSON.stringify(value));
      },
    },
    moderation: {
      type: DataTypes.JSON,
      defaultValue: {banned: false, muted: false, reason: "", expires: 0, history:[]}
    },
    rewards: {
      type: DataTypes.JSON,
      defaultValue: {daily: 0, free_gems: 0}
    }
  },
  {
    sequelize,
    tableName: "users",
  }
);

export default User;
