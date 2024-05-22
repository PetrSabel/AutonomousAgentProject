;; problem file: problem-delivery.pddl
(define (problem default)
    (:domain default)
    (:objects i t1_1 t2_1)
    (:init  
        ;;(agent ?a)
        ;;(friend ?a)
        
        ;;(at ?agent ?tile)

        ;; My info 
        (me i) 
        (not (carry i)) 
        (at i t1_1) 
        (not (scored i))

        ;; Map
        (tile t1_1) (tile t2_1)
        (right t1_1 t2_1)
        (left t2_1 t1_1)
        ;; up 
        ;; down
        (delivery t2_1) 
        ;; spawn 
        (not (free t1_1)) (free t2_1)
        ;; not free 

        ;; Parcels 
        (withparcel t1_1) 

        ;; Other agents 
        ;; agent 
        ;; friend 
        ;; at 
    )

    (:goal (and (not (withparcel t1_1)) (scored i) ))
)
