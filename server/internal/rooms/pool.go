package rooms

import "sync"

type BulletPool struct {
	pool sync.Pool
}

func NewBulletPool() *BulletPool {
	return &BulletPool{pool: sync.Pool{New: func() any { return &Bullet{} }}}
}

func (p *BulletPool) Get() *Bullet {
	return p.pool.Get().(*Bullet)
}

func (p *BulletPool) Put(bullet *Bullet) {
	*bullet = Bullet{}
	p.pool.Put(bullet)
}
