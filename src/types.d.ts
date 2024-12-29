type NullableMap<T> = {
  [P in keyof T]: T[P] | null
}
