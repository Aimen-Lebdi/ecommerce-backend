// Utility for managing socket instance across the application
class SocketEmitter {
  constructor() {
    this.socketInstance = null;
  }

  setSocket(socketInstance) {
    this.socketInstance = socketInstance;
  }

  getSocket() {
    return this.socketInstance;
  }

  // Convenience methods
  emitToAdmins(event, data) {
    if (this.socketInstance) {
      this.socketInstance.emitToAdmins(event, data);
    }
  }

  emitToDashboard(event, data) {
    if (this.socketInstance) {
      this.socketInstance.emitToDashboard(event, data);
    }
  }

  emitToUser(userId, event, data) {
    if (this.socketInstance) {
      this.socketInstance.emitToUser(userId, event, data);
    }
  }

  emitToAll(event, data) {
    if (this.socketInstance) {
      this.socketInstance.emitToAll(event, data);
    }
  }
}

// Export singleton instance
module.exports = new SocketEmitter();
