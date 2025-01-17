declare global {
  namespace NodeJS {
    interface Global {
      __socketStats: {
        connected: boolean;
        connections: number;
        rooms: number;
      }
    }
  }
}

export {} 