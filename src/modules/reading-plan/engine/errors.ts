export class ReadingPlanError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReadingPlanError'
  }
}

export class InvalidInputError extends ReadingPlanError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidInputError'
  }
}
