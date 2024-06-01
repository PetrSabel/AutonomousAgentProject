;; problem file: problem-delivery.pddl
(define (problem default)
    (:domain default)
    (:objects i f t1_1 t2_1 t3_1)
    (:init  
        ;;(agent ?a)
        ;;(friend ?a)
        
        ;;(at ?agent ?tile)

        ;; My info 
        (me i) 
        (not (carry i)) 
        (at i t1_1) 
        (at f t2_1)
        (not (carry f))
        (not (scored i))
        ;;(not (scored f))

        ;; Map
        (tile t1_1) (tile t2_1) (tile t3_1)
        (right t1_1 t2_1) (right t2_1 t3_1)
        (left t2_1 t1_1) (left t3_1 t2_1)
        ;; up 
        ;; down
        (delivery t3_1) 
        ;; spawn 
        (not (free t1_1)) (free t3_1)
        (not (free t2_1))
        ;; not free 

        ;; Parcels 
        (withparcel t1_1) 

        ;; Other agents 
        ;; agent 
        ;; friend 
        (friend f)
        ;; at 
    )

    (:goal (or (scored i) (scored f) ) )
)
