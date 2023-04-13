function clusterColors(index: number): string {
  switch (index % 5) {
    case 0: return 'darkseagreen'
    case 1: return 'plum'
    case 2: return 'skyblue'
    case 3: return 'salmon'
    case 4: return 'sandybrown'
    default: return 'black'
  }
}

export default clusterColors